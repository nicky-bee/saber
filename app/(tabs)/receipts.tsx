import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Button, TouchableOpacity, Switch } from 'react-native';
import { fetchReceipts, createTables, insertReceipt } from '../../services/db';
import { useFocusEffect } from '@react-navigation/native';

export default function ReceiptsScreen() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [formExpanded, setFormExpanded] = useState(false);
  const [totalPrice, setTotalPrice] = useState('');
  const [category, setCategory] = useState('');
  const [isRecurring, setIsRecurring] = useState(false); // New state for recurring switch
  const [recurrenceType, setRecurrenceType] = useState('current_date'); // New state for recurrence type

  useEffect(() => {
    createTables(); // Ensure the table is created
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReceipts(setReceipts); // Fetch the latest data from the database
    }, [])
  );

  const handleSubmit = () => {
    const price = parseFloat(totalPrice);
    if (!isNaN(price) && category) {
      insertReceipt(price, category, isRecurring, isRecurring ? recurrenceType : null); // Insert receipt with recurrence info
      setTotalPrice('');
      setCategory('');
      setFormExpanded(false);
      setIsRecurring(false); // Reset recurring state
      fetchReceipts(setReceipts);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.item, item.is_recurring ? styles.recurringItem : null]}>
      <Text style={styles.priceText}>${item.total_price.toFixed(2)}</Text>
      <Text style={styles.dateText}>Date: {item.date_scanned}</Text>
      <Text style={styles.categoryText}>Category: {item.category}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setFormExpanded(!formExpanded)}
        >
          <Text style={styles.addButtonText}>
            {formExpanded ? 'Cancel' : 'Manually Add Receipt'}
          </Text>
        </TouchableOpacity>

        {formExpanded && (
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Total Price"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={totalPrice}
              onChangeText={setTotalPrice}
            />
            <TextInput
              style={styles.input}
              placeholder="Category"
              placeholderTextColor="#999"
              value={category}
              onChangeText={setCategory}
            />

            {/* Switch for recurring payment */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Recurring Payment?</Text>
              <Switch
                value={isRecurring}
                onValueChange={(value) => setIsRecurring(value)}
              />
            </View>

            {/* Switch for recurrence type */}
            {isRecurring && (
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Charge on:</Text>
                <View style={styles.switchChoices}>
                  <TouchableOpacity
                    style={[styles.switchChoice, recurrenceType === 'current_date' ? styles.activeChoice : null]}
                    onPress={() => setRecurrenceType('current_date')}
                  >
                    <Text style={styles.choiceText}>Current Date</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.switchChoice, recurrenceType === 'beginning_of_month' ? styles.activeChoice : null]}
                    onPress={() => setRecurrenceType('beginning_of_month')}
                  >
                    <Text style={styles.choiceText}>Beginning of Month</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Button title="Submit" onPress={handleSubmit} />
          </View>
        )}
      </View>

      {receipts.length === 0 ? (
        <Text style={styles.noReceiptsText}>No receipts found</Text>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          style={styles.receiptsList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1e21',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 15,
  },
  noReceiptsText: {
    color: '#666',
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  item: {
    backgroundColor: '#008CBA',
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
    width: '100%',
  },
  recurringItem: {
    backgroundColor: 'linear-gradient(to right, #008CBA, #32CD32)', // Blue to green gradient for recurring items
  },
  priceText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f5f5f5',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 16,
    color: '#f5f5f5',
  },
  categoryText: {
    fontSize: 16,
    color: '#cfcfcf',
    fontWeight: '600',
    marginTop: 5,
  },
  addButton: {
    backgroundColor: '#0380a8',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    width: 180,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    marginTop: 10,
    width: '100%',
  },
  input: {
    backgroundColor: '#2e2f32',
    color: '#fff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
    fontSize: 16,
  },
  receiptsList: {
    marginTop: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchLabel: {
    color: '#fff',
    fontSize: 16,
  },
  switchChoices: {
    flexDirection: 'row',
  },
  switchChoice: {
    padding: 10,
    backgroundColor: '#555',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeChoice: {
    backgroundColor: '#008CBA',
  },
  choiceText: {
    color: '#fff',
  },
});