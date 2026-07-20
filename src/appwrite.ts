import { Client, Account, Databases, Query, ID } from 'appwrite';
import { ExerciseEntry, FoodStorage, UserSettings } from './types';


// Initialize Appwrite client
const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject("684ac3bf000ee8950f5a");

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);

// Configuration constants
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DBID
export const FOOD_ENTRIES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_FOODENTRIESID
export const USER_SETTINGS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_USERSETTINGSID
export const MONTHLY_CALORIES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MONTLYCALORIESID
export const SHARED_DAYS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_SHAREDDAYSID
export const EXERCISE_ENTRIES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_EXERCISEENTRIESID

// Auth helper functions
export class AppwriteAuth {
  // Register new user
  static async register(email: string, password: string, name: string) {
    try {
      const response = await account.create('unique()', email, password, name);
      console.debug('User registered:', response);
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  static async login(email: string, password: string) {
    try {
      const session = await account.createEmailPasswordSession(email, password);
      console.debug('User logged in:', session);
      return session;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  static async logout() {
    try {
      await account.deleteSession('current');
      console.debug('User logged out');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const user = await account.get();
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  // Check if user is logged in
  static async isLoggedIn() {
    try {
      await account.get();
      return true;
    } catch {
      return false;
    }
  }
}

// Database helper functions
export class AppwriteDB {
  // Save food entry
  static async saveFoodEntry(entryData: FoodStorage) {
    try {
      const response = await databases.createDocument(
          DATABASE_ID,
          FOOD_ENTRIES_COLLECTION_ID,
          'unique()',
          {
              ...entryData,
              userId: (await account.get()).$id,
          }
      );
      console.debug('Food entry saved:', response);
      return response;
    } catch (error) {
      console.error('Save food entry error:', error);
      throw error;
    }
  }

  // Upadte food entry
  static async updateFoodEntry(documentId: string, entryData: Partial<FoodStorage>) {
    try {
      const response = await databases.updateDocument(
          DATABASE_ID,
          FOOD_ENTRIES_COLLECTION_ID,
          documentId,
          {
              ...entryData,
              userId: (await account.get()).$id,
          }
      );
      console.debug('Food entry updated:', response);
      return response;
    } catch (error) {
      console.error('Update food entry error:', error);
      throw error;
    }
  }

  // Save food entry
  static async saveUserSettings(userSettings: UserSettings) {
    try {
      const response = await databases.createDocument(
          DATABASE_ID,
          USER_SETTINGS_COLLECTION_ID,
          'unique()',
          {
              ...userSettings,
              userId: (await account.get()).$id,
          }
      );
      console.debug('User settings saved:', response);
      return response;
    } catch (error) {
      console.error('Save user settings error:', error);
      throw error;
    }
  }

  // Get user's food entries for a date range (last N days)
  static async getFoodEntriesForDateRange(startDate: Date, endDate: Date) {
    try {
      const user = await account.get();
      const startLocal = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString();
      const endLocal = new Date(endDate.getTime() - (endDate.getTimezoneOffset() * 60000)).toISOString();

      const response = await databases.listDocuments(
        DATABASE_ID,
        FOOD_ENTRIES_COLLECTION_ID,
        [
          Query.equal('userId', user.$id),
          Query.greaterThanEqual('date', startLocal.split('T')[0]),
          Query.lessThanEqual('date', endLocal.split('T')[0]),
          Query.limit(500)
        ]
      );
      console.debug('Food entries retrieved for range:', response);
      return response.documents;
    } catch (error) {
      console.error('Get food entries for range error:', error);
      throw error;
    }
  }

  // Get user's food entries for a specific date
  static async getFoodEntries(date: Date) {
    try {
      const user = await account.get();
      const localDateTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();

      const response = await databases.listDocuments(
        DATABASE_ID,
        FOOD_ENTRIES_COLLECTION_ID,
        [
          Query.equal('userId', user.$id),
          Query.equal('date', localDateTime.split('T')[0]),
          Query.limit(50)
        ]
      );
      console.debug('Food entries retrieved:', response);
      return response.documents;
    } catch (error) {
      console.error('Get food entries error:', error);
      throw error;
    }
  }

  // Get all calories for a particular date
  static async getMonthlyCalories(date: Date) {
    try {
      const user = await account.get();
      const localDateTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();

      const response = await databases.listDocuments(
        DATABASE_ID,
        MONTHLY_CALORIES_COLLECTION_ID,
        [
          Query.equal('userId', user.$id),
          Query.startsWith('date', localDateTime.substring(0, 7)),
          Query.limit(40)
        ]
      );
      console.debug('Food entries retrieved:', response);
      return response.documents;
    } catch (error) {
      console.error('Get all calories for month error:', error);
      throw error;
    }
  }

  static async createMonthlyCaloryForDay(date: Date, totalCalories: number) {
    try {
      const localDateTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();

      const response = await databases.createDocument(
        DATABASE_ID,
        MONTHLY_CALORIES_COLLECTION_ID ,
        'unique()',
        {
          userId: (await account.get()).$id,
          date: localDateTime.substring(0, 10),
          totalCalories: totalCalories
        }
      );
      console.debug('User settings saved:', response);
      return response;
    } catch (error) {
      console.error('Save user settings error:', error);
      throw error;
    }
  }

  static async updateMonthlyCaloryForDay(id: string, date: Date, totalCalories: number) {
    try {
      const localDateTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();

      const response = await databases.updateDocument(
        DATABASE_ID,
        MONTHLY_CALORIES_COLLECTION_ID ,
        id,
        {
          userId: (await account.get()).$id,
          date: localDateTime.substring(0, 10),
          totalCalories: totalCalories
        }
      );
      console.debug('User settings saved:', response);
      return response;
    } catch (error) {
      console.error('Save user settings error:', error);
      throw error;
    }
  }

  // get user's settings
  static async getUserSettings() {
    try {
      const user = await account.get();

      const response = await databases.listDocuments(
        DATABASE_ID,
        USER_SETTINGS_COLLECTION_ID,
        [
          Query.equal('userId', user.$id),
        ]
      );
      console.debug('User settings retrieved:', response);
      return response.documents;
    } catch (error) {
      console.error('Get user settings error:', error);
      throw error;
    }
  }

  static async deleteUserSettings(documentId: string) {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        USER_SETTINGS_COLLECTION_ID,
        documentId
      );
      console.debug('User settings deleted:', documentId);
    } catch (error) {
      console.error('Delete user settings error:', error);
      throw error;
    }
  }

  static async updateUserSettings(documentId: string, settings: Partial<UserSettings>) {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        USER_SETTINGS_COLLECTION_ID,
        documentId,
        {
          ...settings,
          userId: (await account.get()).$id,
        }
      );
      console.debug('User settings updated:', response);
      return response;
    } catch (error) {
      console.error('Update user settings error:', error);
      throw error;
    }
  }

  static async saveUserGoal(goal: UserSettings) {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        USER_SETTINGS_COLLECTION_ID,
        'unique()',
        {
          ...goal,
          userId: (await account.get()).$id,
        }
      );
      console.debug('User goal saved:', response);
      return response;
    } catch (error) {
      console.error('Save user goal error:', error);
      throw error;
    }
  }

  static async updateUserGoal(documentId: string, goal: UserSettings) {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        USER_SETTINGS_COLLECTION_ID,
        documentId,
        {
          ...goal,
          userId: (await account.get()).$id,
        }
      );
      console.debug('User goal updated:', response);
      return response;
    } catch (error) {
      console.error('Update user goal error:', error);
      throw error;
    }
  }

  static async deleteUserGoal(documentId: string) {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        USER_SETTINGS_COLLECTION_ID,
        documentId
      );
      console.debug('User goal deleted:', documentId);
    } catch (error) {
      console.error('Delete user goal error:', error);
      throw error;
    }
  }

  static async setActiveGoal(goalId: string, allGoals: UserSettings[]) {
    try {
      const updates = allGoals
        .filter(goal => goal.id)
        .map(goal =>
          databases.updateDocument(
            DATABASE_ID,
            USER_SETTINGS_COLLECTION_ID,
            goal.id!,
            { isActive: goal.id === goalId }
          )
        );
      await Promise.all(updates);
      console.debug('Active goal set:', goalId);
    } catch (error) {
      console.error('Set active goal error:', error);
      throw error;
    }
  }

  // Delete food entry
  static async deleteFoodEntry(documentId: string) {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        FOOD_ENTRIES_COLLECTION_ID,
        documentId
      );
      console.debug('Food entry deleted:', documentId);
    } catch (error) {
      console.error('Delete food entry error:', error);
      throw error;
    }
  }

  // Create shared day snapshot
  static async createSharedDay(date: Date, foodEntries: FoodStorage[]) {
    try {
      const user = await account.get();
      const shareId = ID.unique();
      const localDateTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();

      const response = await databases.createDocument(
        DATABASE_ID,
        SHARED_DAYS_COLLECTION_ID,
        'unique()',
        {
          shareId: shareId,
          userId: user.$id,
          userName: user.name,
          date: localDateTime.split('T')[0],
          foodEntries: JSON.stringify(foodEntries),
          createdAt: new Date().toISOString()
        }
      );
      console.debug('Shared day created:', response);
      return response;
    } catch (error) {
      console.error('Create shared day error:', error);
      throw error;
    }
  }

  // Get shared day by share ID
  static async getSharedDay(shareId: string) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SHARED_DAYS_COLLECTION_ID,
        [
          Query.equal('shareId', shareId),
          Query.limit(1)
        ]
      );

      if (response.documents.length === 0) {
        throw new Error('Shared day not found');
      }

      console.debug('Shared day retrieved:', response.documents[0]);
      return response.documents[0];
    } catch (error) {
      console.error('Get shared day error:', error);
      throw error;
    }
  }

  // Save exercise entry
  static async saveExerciseEntry(entryData: ExerciseEntry) {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        EXERCISE_ENTRIES_COLLECTION_ID,
        'unique()',
        {
          ...entryData,
          userId: (await account.get()).$id,
        }
      );
      console.debug('Exercise entry saved:', response);
      return response;
    } catch (error) {
      console.error('Save exercise entry error:', error);
      throw error;
    }
  }

  // Update exercise entry
  static async updateExerciseEntry(documentId: string, entryData: Partial<ExerciseEntry>) {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        EXERCISE_ENTRIES_COLLECTION_ID,
        documentId,
        {
          ...entryData,
          userId: (await account.get()).$id,
        }
      );
      console.debug('Exercise entry updated:', response);
      return response;
    } catch (error) {
      console.error('Update exercise entry error:', error);
      throw error;
    }
  }

  // Get user's exercise entries for a specific date
  static async getExerciseEntries(date: Date) {
    try {
      const user = await account.get();
      const localDateTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();

      const response = await databases.listDocuments(
        DATABASE_ID,
        EXERCISE_ENTRIES_COLLECTION_ID,
        [
          Query.equal('userId', user.$id),
          Query.equal('date', localDateTime.split('T')[0]),
          Query.limit(50)
        ]
      );
      console.debug('Exercise entries retrieved:', response);
      return response.documents;
    } catch (error) {
      console.error('Get exercise entries error:', error);
      throw error;
    }
  }

  // Delete exercise entry
  static async deleteExerciseEntry(documentId: string) {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        EXERCISE_ENTRIES_COLLECTION_ID,
        documentId
      );
      console.debug('Exercise entry deleted:', documentId);
    } catch (error) {
      console.error('Delete exercise entry error:', error);
      throw error;
    }
  }
}
