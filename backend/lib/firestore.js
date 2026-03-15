const admin = require("firebase-admin");

// Get Firestore database lazily (after initialization)
function getDb() {
  try {
    return admin.firestore();
  } catch (error) {
    console.error("❌ Error getting Firestore instance:", error);
    throw new Error("Firestore not initialized. Check Firebase Admin setup.");
  }
}

// Convert Firestore Timestamp to serializable format
function serializeTimestamp(timestamp) {
  if (!timestamp) return null;
  // Firestore Timestamp has toDate() method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return {
      _seconds: Math.floor(timestamp.toDate().getTime() / 1000),
      _nanoseconds: timestamp.nanoseconds || 0,
    };
  }
  // Already serialized
  if (timestamp._seconds) {
    return timestamp;
  }
  return timestamp;
}

// Convert Firestore document data to JSON-serializable format
function serializeDocData(data) {
  if (!data) return data;
  const serialized = { ...data };
  
  // Convert all Timestamp fields
  Object.keys(serialized).forEach(key => {
    const value = serialized[key];
    if (value && typeof value === 'object') {
      // Check if it's a Firestore Timestamp
      if (value.toDate && typeof value.toDate === 'function') {
        serialized[key] = serializeTimestamp(value);
      }
      // Recursively handle nested objects
      else if (Array.isArray(value)) {
        serialized[key] = value.map(item => 
          typeof item === 'object' && item !== null && item.toDate 
            ? serializeTimestamp(item) 
            : item
        );
      }
    }
  });
  
  return serialized;
}

// Categories
async function getCategories() {
  try {
    const db = getDb();
    const snapshot = await db.collection("forum_categories").orderBy("order", "asc").get();
    console.log(`✅ Retrieved ${snapshot.docs.length} categories from Firestore`);
    return snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...serializeDocData(doc.data()) 
    }));
  } catch (error) {
    console.error("❌ Error getting categories:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

async function createCategory(categoryData) {
  try {
    const docRef = await getDb().collection("forum_categories").add({
      ...categoryData,
      topicCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id: docRef.id, ...categoryData };
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
}

// Topics
async function getTopics(filters = {}) {
  try {
    const db = getDb();
    let query = db.collection("forum_topics").where("isDeleted", "==", false);

    if (filters.categoryId) {
      query = query.where("categoryId", "==", filters.categoryId);
    }

    // Apply sorting - indexes are already created in Firebase
    if (filters.sortBy === "popular") {
      query = query.orderBy("likesCount", "desc");
    } else if (filters.sortBy === "comments") {
      query = query.orderBy("commentsCount", "desc");
    } else {
      query = query.orderBy("createdAt", "desc");
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.startAfter) {
      query = query.startAfter(filters.startAfter);
    }

    console.log(`🔍 Querying topics with filters:`, filters);
    const snapshot = await query.get();
    console.log(`✅ Retrieved ${snapshot.docs.length} topics from Firestore`);
    return snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...serializeDocData(doc.data()) 
    }));
  } catch (error) {
    console.error("❌ Error getting topics:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      filters: filters,
      stack: error.stack
    });
    throw error;
  }
}

async function getTopicById(topicId) {
  try {
    const doc = await getDb().collection("forum_topics").doc(topicId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...serializeDocData(doc.data()) };
  } catch (error) {
    console.error("Error getting topic:", error);
    throw error;
  }
}

async function createTopic(topicData) {
  try {
    const topicRef = await getDb().collection("forum_topics").add({
      ...topicData,
      likesCount: 0,
      commentsCount: 0,
      isPinned: false,
      isLocked: false,
      isDeleted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update category topic count
    if (topicData.categoryId) {
      const categoryRef = getDb().collection("forum_categories").doc(topicData.categoryId);
      await categoryRef.update({
        topicCount: admin.firestore.FieldValue.increment(1),
      });
    }

    // Update tag usage counts
    if (topicData.tags && topicData.tags.length > 0) {
      for (const tagName of topicData.tags) {
        const tagRef = getDb().collection("forum_tags").doc(tagName.toLowerCase());
        const tagDoc = await tagRef.get();
        if (tagDoc.exists) {
          await tagRef.update({
            usageCount: admin.firestore.FieldValue.increment(1),
          });
        } else {
          await tagRef.set({
            name: tagName,
            usageCount: 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }

    return { id: topicRef.id, ...topicData };
  } catch (error) {
    console.error("Error creating topic:", error);
    throw error;
  }
}

async function updateTopic(topicId, updateData) {
  try {
    await getDb().collection("forum_topics").doc(topicId).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id: topicId, ...updateData };
  } catch (error) {
    console.error("Error updating topic:", error);
    throw error;
  }
}

async function deleteTopic(topicId) {
  try {
    const db = getDb();
    const topicRef = db.collection("forum_topics").doc(topicId);
    const topicSnap = await topicRef.get();
    if (!topicSnap.exists) {
      console.warn("deleteTopic: topic not found", topicId);
      return false;
    }

    const topicData = topicSnap.data();
    await topicRef.update({
      isDeleted: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Decrement topicCount in category if available
    if (topicData.categoryId) {
      const categoryRef = db.collection("forum_categories").doc(topicData.categoryId);
      await categoryRef.update({
        topicCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return true;
  } catch (error) {
    console.error("Error deleting topic:", error);
    throw error;
  }
}

// Comments
async function getCommentsByTopicId(topicId) {
  try {
    // Index is already created in Firebase: topicId (asc), createdAt (asc)
    const snapshot = await getDb().collection("forum_comments")
      .where("topicId", "==", topicId)
      .where("isDeleted", "==", false)
      .orderBy("createdAt", "asc")
      .get();
    
    return snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...serializeDocData(doc.data()) 
    }));
  } catch (error) {
    console.error("Error getting comments:", error);
    throw error;
  }
}

async function createComment(commentData) {
  try {
    const commentRef = await getDb().collection("forum_comments").add({
      ...commentData,
      likesCount: 0,
      isDeleted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update topic comments count
    await getDb().collection("forum_topics").doc(commentData.topicId).update({
      commentsCount: admin.firestore.FieldValue.increment(1),
    });

    // Create notification for topic author (if not the same user)
    const topic = await getTopicById(commentData.topicId);
    if (topic && topic.authorId !== commentData.authorId) {
      await createNotification({
        userId: topic.authorId,
        type: "comment",
        message: `${commentData.authorName} commented on your topic "${topic.title}"`,
        link: `/forum/topics/${commentData.topicId}`,
        read: false,
      });
    }

    return { id: commentRef.id, ...commentData };
  } catch (error) {
    console.error("Error creating comment:", error);
    throw error;
  }
}

async function updateComment(commentId, updateData) {
  try {
    await getDb().collection("forum_comments").doc(commentId).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id: commentId, ...updateData };
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  }
}

async function deleteComment(commentId, topicId) {
  try {
    await getDb().collection("forum_comments").doc(commentId).update({
      isDeleted: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update topic comments count
    await getDb().collection("forum_topics").doc(topicId).update({
      commentsCount: admin.firestore.FieldValue.increment(-1),
    });

    return true;
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
}

// Likes
async function toggleLike(userId, targetType, targetId) {
  try {
    const likeQuery = await getDb().collection("forum_likes")
      .where("userId", "==", userId)
      .where("targetType", "==", targetType)
      .where("targetId", "==", targetId)
      .limit(1)
      .get();

    if (!likeQuery.empty) {
      // Unlike - delete the like
      const likeDoc = likeQuery.docs[0];
      await likeDoc.ref.delete();

      // Decrement likes count
      if (targetType === "topic") {
        await getDb().collection("forum_topics").doc(targetId).update({
          likesCount: admin.firestore.FieldValue.increment(-1),
        });
      } else if (targetType === "comment") {
        await getDb().collection("forum_comments").doc(targetId).update({
          likesCount: admin.firestore.FieldValue.increment(-1),
        });
      }

      return { liked: false };
    } else {
      // Like - create the like
      await getDb().collection("forum_likes").add({
        userId,
        targetType,
        targetId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Increment likes count
      if (targetType === "topic") {
        await getDb().collection("forum_topics").doc(targetId).update({
          likesCount: admin.firestore.FieldValue.increment(1),
        });

        // Create notification
        const topic = await getTopicById(targetId);
        if (topic && topic.authorId !== userId) {
          await createNotification({
            userId: topic.authorId,
            type: "like",
            message: `Someone liked your topic "${topic.title}"`,
            link: `/forum/topics/${targetId}`,
            read: false,
          });
        }
      } else if (targetType === "comment") {
        await getDb().collection("forum_comments").doc(targetId).update({
          likesCount: admin.firestore.FieldValue.increment(1),
        });
      }

      return { liked: true };
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
}

async function getUserLikes(userId, targetType, targetIds) {
  try {
    // Firestore "in" query has a limit of 10 items
    if (!targetIds || targetIds.length === 0) {
      return [];
    }
    
    // Split into chunks of 10 if needed
    if (targetIds.length <= 10) {
      const snapshot = await getDb().collection("forum_likes")
        .where("userId", "==", userId)
        .where("targetType", "==", targetType)
        .where("targetId", "in", targetIds)
        .get();
      return snapshot.docs.map((doc) => doc.data().targetId);
    } else {
      // Handle more than 10 items by splitting into chunks
      const chunks = [];
      for (let i = 0; i < targetIds.length; i += 10) {
        chunks.push(targetIds.slice(i, i + 10));
      }
      
      const allLikes = [];
      for (const chunk of chunks) {
        try {
          const snapshot = await getDb().collection("forum_likes")
            .where("userId", "==", userId)
            .where("targetType", "==", targetType)
            .where("targetId", "in", chunk)
            .get();
          allLikes.push(...snapshot.docs.map((doc) => doc.data().targetId));
        } catch (chunkError) {
          console.warn("Error getting likes for chunk:", chunkError.message);
        }
      }
      return allLikes;
    }
  } catch (error) {
    console.error("Error getting user likes:", error);
    return [];
  }
}

// Notifications
async function getNotifications(userId, limit = 20) {
  try {
    const snapshot = await getDb().collection("forum_notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...serializeDocData(doc.data()),
    }));
  } catch (error) {
    console.error("Error getting notifications:", error);
    throw error;
  }
}

async function createNotification(notificationData) {
  try {
    await getDb().collection("forum_notifications").add({
      ...notificationData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return notificationData;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

async function markNotificationAsRead(notificationId) {
  try {
    await getDb().collection("forum_notifications").doc(notificationId).update({
      read: true,
    });
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

// Search
async function searchTopics(searchTerm, filters = {}) {
  try {
    // Firestore doesn't support full-text search natively
    // For now, we'll search in title and content fields
    // In production, consider using Algolia or Elasticsearch
    
    let query = getDb().collection("forum_topics").where("isDeleted", "==", false);

    if (filters.categoryId) {
      query = query.where("categoryId", "==", filters.categoryId);
    }

    const snapshot = await query.get();
    const allTopics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Simple text search (case-insensitive)
    const searchLower = searchTerm.toLowerCase();
    const filtered = allTopics.filter(
      (topic) =>
        topic.title?.toLowerCase().includes(searchLower) ||
        topic.content?.toLowerCase().includes(searchLower)
    );

    // Sort
    if (filters.sortBy === "popular") {
      filtered.sort((a, b) => b.likesCount - a.likesCount);
    } else if (filters.sortBy === "comments") {
      filtered.sort((a, b) => b.commentsCount - a.commentsCount);
    } else {
      filtered.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
    }

    return filtered.slice(0, filters.limit || 50);
  } catch (error) {
    console.error("Error searching topics:", error);
    throw error;
  }
}

// Tags
async function getPopularTags(limit = 20) {
  try {
    const snapshot = await getDb().collection("forum_tags")
      .orderBy("usageCount", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...serializeDocData(doc.data()),
    }));
  } catch (error) {
    console.error("Error getting popular tags:", error);
    throw error;
  }
}

// Admin management functions
async function isAdmin(email) {
  if (!email) return false;
  const emailLower = email.toLowerCase().trim();
  
  // Check environment variable first (for backward compatibility)
  const envAdmins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  if (envAdmins.includes(emailLower)) {
    return true;
  }
  
  // Check Firestore admins collection
  try {
    const db = getDb();
    const adminDoc = await db.collection("forum_admins").doc(emailLower).get();
    return adminDoc.exists && adminDoc.data().isActive === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

async function addAdmin(email, addedBy) {
  try {
    const db = getDb();
    const emailLower = email.toLowerCase().trim();
    await db.collection("forum_admins").doc(emailLower).set({
      email: emailLower,
      addedBy: addedBy,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    });
    return { success: true, email: emailLower };
  } catch (error) {
    console.error("Error adding admin:", error);
    throw error;
  }
}

async function removeAdmin(email) {
  try {
    const db = getDb();
    const emailLower = email.toLowerCase().trim();
    await db.collection("forum_admins").doc(emailLower).delete();
    return { success: true, email: emailLower };
  } catch (error) {
    console.error("Error removing admin:", error);
    throw error;
  }
}

async function getAdmins() {
  try {
    const db = getDb();
    const snapshot = await db.collection("forum_admins").get();
    const admins = snapshot.docs.map((doc) => ({
      email: doc.id,
      ...serializeDocData(doc.data()),
    }));
    
    // Also include env admins
    const envAdmins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
    
    envAdmins.forEach((email) => {
      if (!admins.find((a) => a.email === email)) {
        admins.push({
          email,
          source: "environment",
          isActive: true,
        });
      }
    });
    
    return admins;
  } catch (error) {
    console.error("Error getting admins:", error);
    throw error;
  }
}

// User blocking functions
async function isUserBlocked(userId) {
  if (!userId) return false;
  try {
    const db = getDb();
    const userDoc = await db.collection("forum_blocked_users").doc(userId).get();
    if (!userDoc.exists) return false;
    const data = userDoc.data();
    return data.isBlocked === true;
  } catch (error) {
    console.error("Error checking user block status:", error);
    return false;
  }
}

async function blockUser(userId, blockedBy, reason = "") {
  try {
    const db = getDb();
    await db.collection("forum_blocked_users").doc(userId).set({
      userId,
      blockedBy,
      reason,
      blockedAt: admin.firestore.FieldValue.serverTimestamp(),
      isBlocked: true,
    });
    return { success: true, userId };
  } catch (error) {
    console.error("Error blocking user:", error);
    throw error;
  }
}

async function unblockUser(userId) {
  try {
    const db = getDb();
    await db.collection("forum_blocked_users").doc(userId).delete();
    return { success: true, userId };
  } catch (error) {
    console.error("Error unblocking user:", error);
    throw error;
  }
}

async function getBlockedUsers() {
  try {
    const db = getDb();
    const snapshot = await db.collection("forum_blocked_users").get();
    return snapshot.docs.map((doc) => ({
      userId: doc.id,
      ...serializeDocData(doc.data()),
    }));
  } catch (error) {
    console.error("Error getting blocked users:", error);
    throw error;
  }
}

module.exports = {
  getCategories,
  createCategory,
  getTopics,
  getTopicById,
  createTopic,
  updateTopic,
  deleteTopic,
  getCommentsByTopicId,
  createComment,
  updateComment,
  deleteComment,
  toggleLike,
  getUserLikes,
  getNotifications,
  createNotification,
  markNotificationAsRead,
  searchTopics,
  getPopularTags,
  // Admin management
  isAdmin,
  addAdmin,
  removeAdmin,
  getAdmins,
  // User blocking
  isUserBlocked,
  blockUser,
  unblockUser,
  getBlockedUsers,
};

