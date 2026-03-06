import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';
import { axiosInstance } from '../../api/api';

const screenWidth = Dimensions.get('window').width;
const CHART_WIDTH = screenWidth - 80;

const COLORS = [
  '#8B5CF6',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
  '#F97316',
  '#A855F7',
];

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function SalesAnalyticsScreen() {
  const { user } = useSelector((state) => state.auth);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      const response = await axiosInstance.get('/orders/admin/analytics');
      setAnalytics(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (!user?.isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.accessDenied}>Access denied. Admins only.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  const { topProducts, categoryBreakdown, monthlyRevenue } = analytics || {};

  // --- Bar Chart: Top Products by Quantity ---
  const barData = (topProducts || []).map((p, i) => ({
    value: p.quantity,
    label: p.name.length > 8 ? p.name.slice(0, 7) + '…' : p.name,
    frontColor: COLORS[i % COLORS.length],
    topLabelComponent: () => (
      <Text style={styles.barTopLabel}>{p.quantity}</Text>
    ),
  }));

  // --- Pie Chart: Revenue by Category ---
  const totalRevenue = (categoryBreakdown || []).reduce(
    (sum, c) => sum + c.revenue,
    0
  );
  const pieData = (categoryBreakdown || []).map((c, i) => ({
    value: c.revenue,
    color: COLORS[i % COLORS.length],
    text: `${totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0}%`,
    textColor: '#FFFFFF',
    textSize: 12,
  }));

  // --- Line Chart: Monthly Revenue ---
  const lineData = (monthlyRevenue || []).map((m) => {
    const monthIndex = parseInt(m.month.split('-')[1], 10) - 1;
    return {
      value: m.revenue,
      label: MONTH_LABELS[monthIndex] || m.month,
      dataPointText: `$${m.revenue >= 1000 ? (m.revenue / 1000).toFixed(1) + 'k' : m.revenue.toFixed(0)}`,
    };
  });

  const hasData =
    barData.length > 0 || pieData.length > 0 || lineData.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B5CF6']} />
      }
    >
      <Text style={styles.pageTitle}>Sales Analytics</Text>
      <Text style={styles.pageSubtitle}>
        Based on all processed & delivered orders
      </Text>

      {!hasData ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No sales data available yet.</Text>
        </View>
      ) : (
        <>
          {/* Chart 1: Top Products by Quantity Sold */}
          {barData.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.chartTitle}>Top Products by Quantity Sold</Text>
              <Text style={styles.chartSubtitle}>
                Top {barData.length} best selling items
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={barData}
                  barWidth={32}
                  spacing={20}
                  roundedTop
                  xAxisThickness={1}
                  yAxisThickness={1}
                  xAxisColor="#E5E7EB"
                  yAxisColor="#E5E7EB"
                  yAxisTextStyle={styles.axisText}
                  xAxisLabelTextStyle={styles.xAxisLabel}
                  noOfSections={5}
                  isAnimated
                  animationDuration={600}
                />
              </ScrollView>
            </View>
          )}

          {/* Chart 2: Revenue by Category */}
          {pieData.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.chartTitle}>Revenue by Category</Text>
              <Text style={styles.chartSubtitle}>
                Total revenue: ${totalRevenue.toFixed(2)}
              </Text>
              <View style={styles.pieContainer}>
                <PieChart
                  data={pieData}
                  donut
                  radius={100}
                  innerRadius={55}
                  innerCircleColor="#FFFFFF"
                  centerLabelComponent={() => (
                    <View style={styles.pieCenterLabel}>
                      <Text style={styles.pieCenterAmount}>
                        ${totalRevenue >= 1000
                          ? (totalRevenue / 1000).toFixed(1) + 'k'
                          : totalRevenue.toFixed(0)}
                      </Text>
                      <Text style={styles.pieCenterText}>Total</Text>
                    </View>
                  )}
                  isAnimated
                  animationDuration={600}
                  textSize={12}
                  showText
                />
              </View>
              {/* Legend */}
              <View style={styles.legendContainer}>
                {(categoryBreakdown || []).map((c, i) => (
                  <View key={c.category} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: COLORS[i % COLORS.length] },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {c.category} — ${c.revenue.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Chart 3: Monthly Revenue Trend */}
          {lineData.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.chartTitle}>Monthly Revenue Trend</Text>
              <Text style={styles.chartSubtitle}>
                Revenue over time
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={lineData}
                  width={Math.max(CHART_WIDTH, lineData.length * 70)}
                  height={200}
                  spacing={60}
                  color="#8B5CF6"
                  thickness={3}
                  dataPointsColor="#8B5CF6"
                  dataPointsRadius={5}
                  startFillColor="rgba(139, 92, 246, 0.3)"
                  endFillColor="rgba(139, 92, 246, 0.01)"
                  areaChart
                  curved
                  xAxisThickness={1}
                  yAxisThickness={1}
                  xAxisColor="#E5E7EB"
                  yAxisColor="#E5E7EB"
                  yAxisTextStyle={styles.axisText}
                  xAxisLabelTextStyle={styles.xAxisLabel}
                  noOfSections={5}
                  isAnimated
                  animationDuration={600}
                  textShiftY={-8}
                  textShiftX={-5}
                  textFontSize={10}
                  textColor="#6B7280"
                  yAxisLabelPrefix="$"
                />
              </ScrollView>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  accessDenied: {
    fontSize: 18,
    color: '#EF4444',
    fontFamily: 'CustomFont',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'CustomFont',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontFamily: 'CustomFont',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'CustomFont',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'CustomFont',
    marginBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontFamily: 'CustomFont',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'CustomFont',
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'CustomFont',
    marginBottom: 16,
  },
  barTopLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: 'CustomFont',
    marginBottom: 4,
  },
  axisText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: 'CustomFont',
  },
  xAxisLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontFamily: 'CustomFont',
    width: 50,
    textAlign: 'center',
  },
  pieContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  pieCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
    fontFamily: 'CustomFont',
  },
  pieCenterText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'CustomFont',
  },
  legendContainer: {
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: 'CustomFont',
  },
});
