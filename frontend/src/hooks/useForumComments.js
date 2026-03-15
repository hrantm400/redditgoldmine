import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Helper to serialize Firestore Timestamp
const serializeDocData = (data) => {
  if (!data) return data;
  const serialized = { ...data };
  
  Object.keys(serialized).forEach(key => {
    const value = serialized[key];
    if (value && typeof value === 'object') {
      // Firestore Timestamp
      if (value.toDate && typeof value.toDate === 'function') {
        serialized[key] = {
          _seconds: Math.floor(value.toDate().getTime() / 1000),
          _nanoseconds: value.nanoseconds || 0,
        };
      }
      // Array of timestamps
      else if (Array.isArray(value)) {
        serialized[key] = value.map(item => 
          typeof item === 'object' && item !== null && item.toDate 
            ? {
                _seconds: Math.floor(item.toDate().getTime() / 1000),
                _nanoseconds: item.nanoseconds || 0,
              }
            : item
        );
      }
    }
  });
  
  return serialized;
};

export function useForumComments(topicId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!topicId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query for comments
      const q = query(
        collection(db, 'forum_comments'),
        where('topicId', '==', topicId),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'asc')
      );

      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const commentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...serializeDocData(doc.data())
          }));
          setComments(commentsData);
          setLoading(false);
        },
        (err) => {
          console.error('Error listening to comments:', err);
          setError(err);
          setLoading(false);
        }
      );

      // Cleanup: unsubscribe when component unmounts or topicId changes
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('Error setting up comments listener:', err);
      setError(err);
      setLoading(false);
    }
  }, [topicId]);

  return { comments, loading, error };
}


