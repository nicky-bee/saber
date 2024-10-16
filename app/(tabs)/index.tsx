import React, { useEffect, useState, useCallback } from 'react';
import { Text, View, StyleSheet, Dimensions, ScrollView, TextInput } from 'react-native';
import { LineChart } from 'react-native-chart-kit'; 
import { getReceiptsForLast30Days, fetchPaycheck, insertOrUpdatePaycheck, createTables, dropReceiptTable } from '../../services/db';
import { Bar } from 'react-native-progress';
import { useFocusEffect } from '@react-navigation/native';

export default function Index() {
  const [total, setTotal] = useState(0);
  const [dailyTotals, setDailyTotals] = useState<number[]>(Array(30).fill(0));
  const [paycheck, setPaycheck] = useState(0);
  const [inputPaycheck, setInputPaycheck] = useState('');

  // Function to fetch receipts and paycheck
  const fetchTotal = useCallback(() => {
    getReceiptsForLast30Days((receipts) => {
      const totalSum = receipts.reduce((sum, receipt) => sum + receipt.total_price, 0);
      setTotal(totalSum);

      const totalsByDay = Array(30).fill(0);
      receipts.forEach((receipt) => {
        const receiptDate = new Date(receipt.date_scanned);
        const dayIndex = 29 - Math.floor((Date.now() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayIndex >= 0 && dayIndex < 30) {
          totalsByDay[dayIndex] += receipt.total_price;
        }
      });
      
      setDailyTotals(totalsByDay);
    });

    // Fetch the saved paycheck
    fetchPaycheck((savedPaycheck) => {
      setPaycheck(savedPaycheck);
      setInputPaycheck(savedPaycheck.toString());
    });
  }, []);

  // Automatically refresh data when the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchTotal();
    }, [fetchTotal])
  );

  useEffect(() => {
    // Ensure tables are created on component mount
    createTables();
    fetchTotal();
  }, [fetchTotal]);

  const handlePaycheckChange = (text: string) => {
    setInputPaycheck(text);

    // Parse the input as a float and handle potential formatting issues
    const paycheckAmount = parseFloat(text.replace(/[^0-9.-]+/g,"")); // Remove non-numeric characters

    if (!isNaN(paycheckAmount) && paycheckAmount > 0) {
        setPaycheck(paycheckAmount);
        insertOrUpdatePaycheck(paycheckAmount); // Automatically save paycheck when the user types
    } else {
        setPaycheck(0); // Set paycheck to 0 if the input is invalid
        insertOrUpdatePaycheck(0); // Also update the database with 0
    }
  };

  // Calculate the spending ratio to display in the progress bar
  const spendingRatio = paycheck > 0 ? total / paycheck : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total spent in the last 30 days</Text>
        <Text style={styles.amount}>${total.toFixed(2)}</Text>
      </View>

      {/* Input for bi-weekly paycheck */}
      <View style={styles.paycheckContainer}>
        <Text style={styles.paycheckText}>Enter your bi-weekly paycheck:</Text>
        <TextInput
            style={styles.input}
            value={inputPaycheck}
            placeholder="                                                 "
            keyboardType="numeric"
            onChangeText={handlePaycheckChange}
        />
      </View>

      {/* Spending Metric - Progress Bar */}
      <View style={styles.metricContainer}>
        <Bar 
          progress={spendingRatio > 1 ? 1 : spendingRatio} // Cap at 1 (100%)
          width={Dimensions.get('window').width - 100}
          height={20}
          color={spendingRatio > 1 ? '#FF4F4F' : '#4CAF50'} // Red if overspending, green otherwise
          borderRadius={5}
        />
        {spendingRatio > 1 ? (
          <Text style={styles.warningText}>
            You are overspending by ${Math.abs((total - paycheck).toFixed(2))}.
          </Text>
        ) : (
          <Text style={styles.safeText}>
            You are within your paycheck limit.
          </Text>
        )}
      </View>

      <LineChart
        data={{
          labels: ['30', '25', '20', '15', '10', '5'],
          datasets: [
            {
              data: dailyTotals,
            },
          ],
        }}
        width={Dimensions.get('window').width - 40}
        height={220}
        yAxisLabel="$"
        chartConfig={{
          backgroundColor: '#e26a00',
          backgroundGradientFrom: '#008CBA',
          backgroundGradientTo: '#2bcaff',
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16,
          },
        }}
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withDots={true}
        getDotColor={(dataPoint, dataPointIndex) => {
          return dataPointIndex % 5 === 0 || dataPointIndex === 29 ? 'rgba(255, 255, 255, 1)' : 'transparent';
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  totalContainer: {
    backgroundColor: '#1e2430',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  totalText: {
    color: '#8fa1b2',
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  amount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  paycheckContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  paycheckText: {
    color: '#8fa1b2',
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    borderColor: '#8fa1b2',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    color: '#fff',
    marginBottom: 10,
    width: '100%',
    textAlign: 'center',
  },
  metricContainer: {
    backgroundColor: '#1e2430',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  metricText: {
    color: '#fff',
    fontSize: 16,
  },
  warningText: {
    color: '#FF4F4F',
    fontSize: 16,
  },
  safeText: {
    color: '#4CAF50',
    fontSize: 16,
  },
});