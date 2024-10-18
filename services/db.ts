import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('receipts.db');

// Function to create the table if it doesn't exist
export const createTables = () => {
  db.transaction((tx) => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_price REAL,
        date_scanned TEXT,
        category TEXT,
        is_recurring INTEGER DEFAULT 0,  -- New column to indicate if the receipt is recurring
        recurrence_type TEXT  -- New column to store recurrence type ('current_date' or 'beginning_of_month')
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS paycheck (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS budget (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL
      );`
    );
  });
};

// Insert a new receipt with optional recurring info
export const insertReceipt = (total_price: number, category: string, isRecurring: boolean, recurrenceType: string | null) => {
  const date_scanned = new Date().toISOString().split('T')[0];
  db.transaction((tx) => {
    tx.executeSql(
      `INSERT INTO receipts (total_price, date_scanned, category, is_recurring, recurrence_type) VALUES (?, ?, ?, ?, ?);`,
      [total_price, date_scanned, category, isRecurring ? 1 : 0, recurrenceType]
    );
  });
};

// Fetch all receipts, sorting recurring receipts to the bottom
export const fetchReceipts = (setReceipts: (data: any) => void) => {
  db.transaction((tx) => {
    tx.executeSql(
      `SELECT * FROM receipts ORDER BY is_recurring ASC, date_scanned DESC;`, // Recurring receipts sorted to bottom
      [],
      (txObj, resultSet) => {
        setReceipts(resultSet.rows._array);
      }
    );
  });
};

// Function to get receipts from the last 30 days
export const getReceiptsForLast30Days = (callback: (data: any) => void) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const formattedDate = thirtyDaysAgo.toISOString().split('T')[0]; // Gets date 30 days ago in YYYY-MM-DD format

  db.transaction((tx) => {
    tx.executeSql(
      `SELECT * FROM receipts WHERE date_scanned >= ?;`,
      [formattedDate],
      (txObj, resultSet) => {
        callback(resultSet.rows._array); // Calls the callback function with the retrieved receipts
      },
      (txObj, error) => {
        console.error('Error fetching receipts from the last 30 days: ', error);
        return false;
      }
    );
  });
};

export const insertOrUpdatePaycheck = (amount: number) => {
  db.transaction((tx) => {
    // Insert the new paycheck amount, update if conflict
    tx.executeSql(
      `INSERT INTO paycheck (id, amount) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET amount = ?;`,
      [amount, amount],  // Pass the amount twice, once for INSERT and once for UPDATE
      () => {
        // console.log('Paycheck updated successfully.');
      },
      (txObj, error) => {
        console.error('Error inserting/updating paycheck: ', error);
        return false;
      }
    );
  });
};

export const insertOrUpdateBudget = (amount: number) => {
  db.transaction((tx) => {
    // Insert the new budget amount, update if conflict
    tx.executeSql(
      `INSERT INTO budget (id, amount) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET amount = ?;`,
      [amount, amount],  // Pass the amount twice, once for INSERT and once for UPDATE
      () => {
      },
      (txObj, error) => {
        console.error('Error inserting/updating budget: ', error);
        return false;
      }
    );
  });
};

export const dropReceiptTable = () => {
  db.transaction((tx) => {
    tx.executeSql(
      `DROP TABLE IF EXISTS receipts;`,
      [],
      () => {
        console.log('Paycheck table dropped successfully.');
      },
      (txObj, error) => {
        console.error('Error dropping paycheck table: ', error);
        return false
      }
    );
  });
};

export const dropPaycheckTable = () => {
  db.transaction((tx) => {
    tx.executeSql(
      `DROP TABLE IF EXISTS paycheck;`,
      [],
      () => {
        console.log('Paycheck table dropped successfully.');
      },
      (txObj, error) => {
        console.error('Error dropping paycheck table: ', error);
        return false
      }
    );
  });
};

// Function to fetch the paycheck amount
export const fetchPaycheck = (callback: (amount: number) => void) => {
  db.transaction((tx) => {
    tx.executeSql(
      `SELECT amount FROM paycheck WHERE id = 1;`, // Fetch paycheck with ID 1
      [1], // Pass ID as parameter
      (txObj, { rows }) => {
        if (rows.length > 0) {
          callback(rows.item(0).amount); // Use rows.item(0) instead of rows._array[0]
        } else {
          callback(0); // If no paycheck saved, return 0
        }
      },
      (txObj, error) => {
        console.error('Error fetching paycheck: ', error);
        return false
      }
    );
  });
};

// Function to fetch the budget amount
export const fetchBudget = (callback: (amount: number) => void) => {
  db.transaction((tx) => {
    tx.executeSql(
      `SELECT amount FROM budget WHERE id = 1;`, // Fetch budget with ID 1
      [1], // Pass ID as parameter
      (txObj, { rows }) => {
        if (rows.length > 0) {
          callback(rows.item(0).amount); // Use rows.item(0) instead of rows._array[0]
        } else {
          callback(0); // If no budget saved, return 0
        }
      },
      (txObj, error) => {
        console.error('Error fetching budget: ', error);
        return false
      }
    );
  });
};

export default db;