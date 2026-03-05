import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllReviews, adminDeleteReview } from '../../redux/slices/reviewsSlice';

const AdminReviewsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { allReviews, loading } = useSelector((state) => state.reviews);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    dispatch(fetchAllReviews());
  }, [dispatch]);

  if (!user?.isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.forbidden}>Access denied. Admins only.</Text>
      </View>
    );
  }

  const handleDelete = (reviewId) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(adminDeleteReview(reviewId)).unwrap();
              Alert.alert('Success', 'Review deleted successfully');
              setShowDetailModal(false);
              setSelectedReview(null);
            } catch (err) {
              Alert.alert('Error', err?.error || 'Failed to delete review');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const renderReviewItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reviewCard}
      onPress={() => {
        setSelectedReview(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.userInfo}>
          {item.userId?.profilePicture ? (
            <Image source={{ uri: item.userId.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(item.userId?.username || '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{item.userId?.username || 'Unknown User'}</Text>
            <Text style={styles.email}>{item.userId?.email || ''}</Text>
          </View>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>{item.rating} ★</Text>
        </View>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productLabel}>Product: </Text>
        <Text style={styles.productName} numberOfLines={1}>
          {item.productId?.name || 'Deleted Product'}
        </Text>
      </View>

      {item.comment ? (
        <Text style={styles.comment} numberOfLines={2}>{item.comment}</Text>
      ) : null}

      <View style={styles.reviewFooter}>
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        {item.isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{allReviews.length}</Text>
          <Text style={styles.statLabel}>Total Reviews</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {allReviews.length > 0
              ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
              : '0'}
          </Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {allReviews.filter((r) => r.rating >= 4).length}
          </Text>
          <Text style={styles.statLabel}>Positive</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={allReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          }
        />
      )}

      {/* Review Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Review Details</Text>

              {/* User Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Reviewer</Text>
                <View style={styles.modalUserRow}>
                  {selectedReview?.userId?.profilePicture ? (
                    <Image
                      source={{ uri: selectedReview.userId.profilePicture }}
                      style={styles.modalAvatar}
                    />
                  ) : (
                    <View style={[styles.modalAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {(selectedReview?.userId?.username || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.modalUsername}>
                      {selectedReview?.userId?.username || 'Unknown User'}
                    </Text>
                    <Text style={styles.modalEmail}>
                      {selectedReview?.userId?.email || ''}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Product Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Product</Text>
                <View style={styles.modalProductRow}>
                  {selectedReview?.productId?.image ? (
                    <Image
                      source={{ uri: selectedReview.productId.image }}
                      style={styles.modalProductImage}
                    />
                  ) : null}
                  <Text style={styles.modalProductName}>
                    {selectedReview?.productId?.name || 'Deleted Product'}
                  </Text>
                </View>
              </View>

              {/* Rating */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Rating</Text>
                <Text style={styles.modalStars}>
                  {renderStars(selectedReview?.rating || 0)}
                </Text>
                <Text style={styles.modalRatingNumber}>
                  {selectedReview?.rating}/5
                </Text>
              </View>

              {/* Comment */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Comment</Text>
                <Text style={styles.modalComment}>
                  {selectedReview?.comment || 'No comment provided'}
                </Text>
              </View>

              {/* Meta */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Details</Text>
                <Text style={styles.modalMeta}>
                  Date: {selectedReview ? new Date(selectedReview.createdAt).toLocaleString() : ''}
                </Text>
                <Text style={styles.modalMeta}>
                  Verified Purchase: {selectedReview?.isVerified ? 'Yes' : 'No'}
                </Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(selectedReview?._id)}
              >
                <Text style={styles.deleteBtnText}>Delete Review</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowDetailModal(false);
                  setSelectedReview(null);
                }}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  forbidden: {
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'CustomFont',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B5CF6',
    fontFamily: 'CustomFont',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'CustomFont',
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'CustomFont',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'CustomFont',
  },
  email: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'CustomFont',
  },
  ratingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D97706',
    fontFamily: 'CustomFont',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'CustomFont',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    flex: 1,
    fontFamily: 'CustomFont',
  },
  comment: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
    fontFamily: 'CustomFont',
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'CustomFont',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    fontFamily: 'CustomFont',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'CustomFont',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'CustomFont',
  },
  modalSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontFamily: 'CustomFont',
  },
  modalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  modalUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'CustomFont',
  },
  modalEmail: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'CustomFont',
  },
  modalProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalProductImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  modalProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    fontFamily: 'CustomFont',
  },
  modalStars: {
    fontSize: 28,
    color: '#F59E0B',
  },
  modalRatingNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'CustomFont',
  },
  modalComment: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    fontFamily: 'CustomFont',
  },
  modalMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    fontFamily: 'CustomFont',
  },
  modalActions: {
    marginTop: 12,
    gap: 8,
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'CustomFont',
  },
  modalCancel: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 15,
    fontFamily: 'CustomFont',
  },
});

export default AdminReviewsScreen;
