import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { insertReceipt } from '../../services/db'; // Import database insert function
import OpenAI from 'openai';

export default function CameraScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permission to access the media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setIsProcessing(true); // Start processing
      const uri = result.assets[0].uri;
      try {
        const visionAPIResult = await fetchGoogleVisionAPI(uri);
        processWithOpenAI(visionAPIResult);
      } catch (error) {
        console.log('Error recognizing picked image text:', error);
      }
    }
  };

  const takePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permission to access the camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setIsProcessing(true); // Start processing
      const uri = result.assets[0].uri;
      try {
        const visionAPIResult = await fetchGoogleVisionAPI(uri);
        processWithOpenAI(visionAPIResult);
      } catch (error) {
        console.log('Error recognizing camera text:', error);
      }
    }
  };

  const fetchGoogleVisionAPI = async (uri: string) => {
    const base64Image = await convertImageToBase64(uri);
    const apiKey = process.env.REACT_APP_GOOGLEVISION_API_KEY;
    const googleVisionAPIUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const body = JSON.stringify({
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    });

    const response = await fetch(googleVisionAPIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    const result = await response.json();
    return result.responses[0].fullTextAnnotation.text;
  };

  const convertImageToBase64 = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processWithOpenAI = async (text: string) => {
    const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    try {
      const conditions = [
        "You are looking at the raw text of a receipt extracted using an OCR. ",
        "I need you to output the following components and nothing more. ",
        "Please find the total price of the raw text, and output it on the first line as 'TOTAL_PRICE: $<total price>'. ",
        "Please choose a category to output on the final line based on this list of categories: [Utilities, Gas, Dining, Groceries, Transportation, Pet Care, Entertainment, Health & Wellness, Apparel, Office Supplies, Education, Personal Care, Travel, Misc]. Output it as 'CATEGORY: <category>'. "
      ];

      const prompt = `${conditions} Here is the text: ${text}`;

      const openai = new OpenAI({
        apiKey: API_KEY,
      });
      
      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });

      const completion = chatCompletion.choices[0].message.content;

      const totalPrice = extractTotalPrice(completion); 
      const category = extractCategory(completion);
      insertReceipt(totalPrice, category);

      setIsProcessing(false);
      setIsSaved(true); // Set saved state to true after processing
    } catch (error) {
      console.error('Error with OpenAI:', error);
      setIsProcessing(false);
    }
  };

  const extractTotalPrice = (completion: string): number => {
    const priceMatch = completion.match(/TOTAL_PRICE:\s*\$?(\d+(\.\d{2})?)/i);
    return priceMatch ? parseFloat(priceMatch[1]) : 0;
  };

  const extractCategory = (completion: string): string => {
    const categoryMatch = completion.match(/CATEGORY:\s*(\w+)/i);
    return categoryMatch ? categoryMatch[1] : 'Uncategorized';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Select an image</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={takePicture}>
        <Text style={styles.buttonText}>Take a picture</Text>
      </TouchableOpacity>
      {isProcessing ? (
        <ActivityIndicator size="large" color="#00ff00" style={styles.loader} /> // Show loading animation
      ) : isSaved ? (
        <Text style={styles.successMessage}>Receipt has been successfully saved</Text> // Show success message
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1e21',
    padding: 20,
  },
  button: {
    backgroundColor: '#008CBA',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    color: '#008CBA',
    marginTop: 20,
  },
  successMessage: {
    color: '#00ff00',
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
  },
});