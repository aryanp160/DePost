
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from 'firebase/auth';

interface UserData {
  u?: string; // username (shortened field name)
  k?: string; // api key (shortened field name)
  s?: string; // secret (shortened field name)
}

export const getUserData = async (user: User): Promise<UserData | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.exists() ? userDoc.data() as UserData : null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

export const updateUserData = async (user: User, data: Partial<UserData>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, data, { merge: true });
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
};

export const updateUsername = async (user: User, username: string): Promise<void> => {
  await updateUserData(user, { u: username });
};

export const updateIPFSKeys = async (user: User, apiKey: string, secret: string): Promise<void> => {
  await updateUserData(user, { k: apiKey, s: secret });
};
