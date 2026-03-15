import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
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

export function useForumTopics(categoryId = null, sortBy = 'newest', maxResults = 20) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      // Build query
      let q = query(
        collection(db, 'forum_topics'),
        where('isDeleted', '==', false)
      );

      // Add category filter if specified
      if (categoryId) {
        q = query(q, where('categoryId', '==', categoryId));
      }

      // Add sorting
      if (sortBy === 'popular') {
        q = query(q, orderBy('likesCount', 'desc'));
      } else if (sortBy === 'comments') {
        q = query(q, orderBy('commentsCount', 'desc'));
      } else {
        q = query(q, orderBy('createdAt', 'desc'));
      }

      // Add limit
      q = query(q, limit(maxResults));

      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const topicsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...serializeDocData(doc.data())
          }));
          setTopics(topicsData);
          setLoading(false);
        },
        (err) => {
          console.error('Error listening to topics:', err);
          setError(err);
          setLoading(false);
        }
      );

      // Cleanup: unsubscribe when component unmounts or dependencies change
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('Error setting up topics listener:', err);
      setError(err);
      setLoading(false);
    }
  }, [categoryId, sortBy, maxResults]);

  return { topics, loading, error };
}


