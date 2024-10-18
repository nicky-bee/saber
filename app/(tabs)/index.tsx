import React, { useEffect, useState, useCallback } from 'react';
import { Text, View, StyleSheet, Dimensions, ScrollView, TextInput } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Bar } from 'react-native-progress';
import { useFocusEffect } from '@react-navigation/native';
import { getReceiptsForLast30Days, fetchPaycheck, fetchBudget, insertOrUpdatePaycheck, insertOrUpdateBudget, createTables } from '../../services/db';

export default function Index() {
  const [total, setTotal] = useState(0);
  const [dailyTotals, setDailyTotals] = useState<number[]>(Array(30).fill(0));
  const [paycheck, setPaycheck] = useState(0);
  const [inputPaycheck, setInputPaycheck] = useState('');
  const [budget, setBudget] = useState(0);
  const [inputBudget, setInputBudget] = useState('');

  const fetchTotal = useCallback(() => {
    getReceiptsForLast30Days((receipts) => {
      const totalSum = receipts.reduce((sum: any, receipt: { total_price: any; }) => sum + receipt.total_price, 0);
      setTotal(totalSum);

      const totalsByDay = Array(30).fill(0);
      receipts.forEach((receipt: any) => {
        const receiptDate = new Date(receipt.date_scanned);
        const dayIndex = 29 - Math.floor((Date.now() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayIndex >= 0 && dayIndex < 30) {
          totalsByDay[dayIndex] += receipt.total_price;
        }
      });
      setDailyTotals(totalsByDay);
    });

    fetchPaycheck((savedPaycheck) => {
      setPaycheck(savedPaycheck);
      setInputPaycheck(savedPaycheck.toString());
    });

    fetchBudget((savedBudget) => {
      setBudget(savedBudget);
      setInputBudget(savedBudget.toString());
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTotal();
    }, [fetchTotal])
  );

  useEffect(() => {
    createTables();
    fetchTotal();
  }, [fetchTotal]);

  const handlePaycheckChange = (text: string) => {
    setInputPaycheck(text);
    const paycheckAmount = parseFloat(text.replace(/[^0-9.-]+/g,""));
    if (!isNaN(paycheckAmount) && paycheckAmount > 0) {
      setPaycheck(paycheckAmount);
      insertOrUpdatePaycheck(paycheckAmount);
    } else {
      setPaycheck(0);
      insertOrUpdatePaycheck(0);
    }
  };

  const handleBudgetChange = (text: string) => {
    setInputBudget(text);
    const budgetAmount = parseFloat(text.replace(/[^0-9.-]+/g,""));
    if (!isNaN(budgetAmount) && budgetAmount > 0) {
      setBudget(budgetAmount);
      insertOrUpdateBudget(budgetAmount);
    } else {
      setBudget(0);
      insertOrUpdateBudget(0);
    }
  };

  const spendingRatio = paycheck > 0 ? total / paycheck : 0;
  const savingsGoalRatio = budget > 0 && paycheck > 0 ? (paycheck - budget) / paycheck : 0;

  // Determine the color of the progress bar
  const progressBarColor = total > paycheck
    ? '#FF4F4F' // Red for overspending income
    : total > (paycheck - budget)
    ? '#FFD700' // Yellow for overspending budget but within income
    : '#4CAF50'; // Green for within budget

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total spent in the last 30 days</Text>
        <Text style={styles.amount}>${total.toFixed(2)}</Text>
      </View>

      <View style={styles.paycheckContainer}>
        <Text style={styles.paycheckText}>Enter your estimated monthly income:</Text>
        <TextInput
          style={styles.input}
          value={inputPaycheck}
          placeholder="                                                 "
          keyboardType="numeric"
          onChangeText={handlePaycheckChange}
        />
      </View>

      <View style={styles.paycheckContainer}>
        <Text style={styles.paycheckText}>Enter how much you would like to save:</Text>
        <TextInput
          style={styles.input}
          value={inputBudget}
          placeholder="                                                 "
          keyboardType="numeric"
          onChangeText={handleBudgetChange}
        />
      </View>

      <View style={styles.metricContainer}>
        <View style={styles.progressContainer}>
          <Bar 
            progress={spendingRatio > 1 ? 1 : spendingRatio}  // Progress based on spending relative to paycheck
            width={Dimensions.get('window').width - 100}
            height={20}
            color={progressBarColor}
            borderRadius={5}
          />
          {savingsGoalRatio > 0 && savingsGoalRatio < 1 && (
            <View
              style={[styles.savingsMarker, { left: `${savingsGoalRatio * 100}%` }]}  // Marker based on budget relative to paycheck
            />
          )}
        </View>

        {total > paycheck ? (
          <Text style={styles.warningText}>
            You are overspending by ${Math.abs((total - paycheck).toFixed(2))}.
          </Text>
        ) :  total > (paycheck - budget) ? (
          <Text style={styles.warningText}>
            You are overspending your budget by ${Math.abs((total - budget).toFixed(2))}.
          </Text>
        ) : (
          <Text style={styles.safeText}>
            You are within your budget.
          </Text>
        )}
      </View>

      <LineChart
        data={{
          labels: ['30', '25', '20', '15', '10', '5'],
          datasets: [{ data: dailyTotals }],
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
          style: { borderRadius: 16 },
        }}
        style={{ marginVertical: 8, borderRadius: 16 }}
        withDots={true}
        getDotColor={(dataPoint, dataPointIndex) =>
          dataPointIndex % 5 === 0 || dataPointIndex === 29
            ? 'rgba(255, 255, 255, 1)'
            : 'transparent'
        }
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
  progressContainer: {
    position: 'relative',
    width: Dimensions.get('window').width - 100,
  },
  savingsMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFEB3B',
  },
  warningText: {
    color: '#FFD700',
    fontSize: 16,
    marginTop: 10,
  },
  safeText: {
    color: '#4CAF50',
    fontSize: 16,
    marginTop: 10,
  },
});