import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { styles } from '@/assets/styles/history.styles.js'
import { COLORS } from '@/constants/colors'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Page() {
  const router = useRouter()
  const { user } = useUser()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all') // all, paid_by_you, paid_by_others
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expenseHistory, setExpenseHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const categories = [
    { id: 'all', name: 'All Categories', icon: 'apps' },
    { id: 'food', name: 'Food & Dining', icon: 'restaurant' },
    { id: 'transport', name: 'Transportation', icon: 'car' },
    { id: 'entertainment', name: 'Entertainment', icon: 'musical-notes' },
    { id: 'groceries', name: 'Groceries', icon: 'basket' },
    { id: 'utilities', name: 'Utilities', icon: 'flash' },
    { id: 'general', name: 'General', icon: 'receipt' }
  ]

  const filters = [
    { id: 'all', name: 'All Expenses' },
    { id: 'paid_by_you', name: 'Paid by You' },
    { id: 'paid_by_others', name: 'Paid by Others' }
  ]

  // Fetch expense history from backend
  const fetchExpenseHistory = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Get user UUID from AsyncStorage
      const userUUID = await AsyncStorage.getItem('userUUID')
      
      if (!userUUID) {
        setError('User not authenticated. Please sign in again.')
        return
      }

      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL
      
      if (!baseUrl) {
        setError('Server configuration error. Please try again later.')
        return
      }

      // Try the same endpoint as recent expenses first
      const response = await fetch(`${baseUrl}/recent-expense/${userUUID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const expenses = await response.json()
        setExpenseHistory(expenses)
      } else if (response.status === 404) {
        // No expenses found - this is normal for new users
        setExpenseHistory([])
      } else {
        setError(`Failed to load expense history: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching expense history:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch expenses when component mounts
  useEffect(() => {
    fetchExpenseHistory()
  }, [])

  // Filter expenses based on search and filters
  const filteredExpenses = expenseHistory.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'paid_by_you' && expense.paidBy === user?.id) ||
      (selectedFilter === 'paid_by_others' && expense.paidBy !== user?.id)
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory
    
    return matchesSearch && matchesFilter && matchesCategory
  })

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.icon || 'receipt'
  }

  const renderExpenseItem = (expense) => (
    <View 
      key={expense.id} 
      style={styles.expenseItem}
    >
      <View style={styles.expenseIconContainer}>
        <Ionicons 
          name={getCategoryIcon(expense.category)} 
          size={24} 
          color={COLORS.primary} 
        />
      </View>
      
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDescription} numberOfLines={1}>
          {expense.description}
        </Text>
        <Text style={styles.expenseAmount}>
          ${expense.amount.toFixed(2)}
        </Text>
        {expense.groupName && (
          <Text style={styles.expenseGroup} numberOfLines={1}>
            {expense.groupName}
          </Text>
        )}
      </View>
      
      <View style={styles.expenseRight}>
        <Text style={[
          styles.expenseShare,
          { color: expense.paidBy === user?.id ? COLORS.income : COLORS.expense }
        ]}>
          ${(expense.yourShare || expense.amount / (expense.participants?.length || 1)).toFixed(2)}
        </Text>
        {expense.settled && (
          <View style={styles.settledBadge}>
            <Text style={styles.settledText}>Settled</Text>
          </View>
        )}
      </View>
    </View>
  )

  const renderFilterChip = (filter) => (
    <TouchableOpacity
      key={filter.id}
      style={[
        styles.filterChip,
        selectedFilter === filter.id && styles.selectedFilterChip
      ]}
      onPress={() => setSelectedFilter(filter.id)}
    >
      <Text style={[
        styles.filterChipText,
        selectedFilter === filter.id && styles.selectedFilterChipText
      ]}>
        {filter.name}
      </Text>
    </TouchableOpacity>
  )

  const renderCategoryChip = (category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryChip,
        selectedCategory === category.id && styles.selectedCategoryChip
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Ionicons 
        name={category.icon} 
        size={16} 
        color={selectedCategory === category.id ? COLORS.white : COLORS.textLight} 
      />
      <Text style={[
        styles.categoryChipText,
        selectedCategory === category.id && styles.selectedCategoryChipText
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  )

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Expense History</Text>
          <TouchableOpacity onPress={() => router.push('/add-expense')}>
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading expense history...</Text>
        </View>
      </View>
    )
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Expense History</Text>
          <TouchableOpacity onPress={() => router.push('/add-expense')}>
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.expense} />
          <Text style={styles.errorTitle}>Unable to load expenses</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchExpenseHistory}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Expense History</Text>
        <TouchableOpacity onPress={() => router.push('/add-expense')}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search expenses..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        {filters.map(renderFilterChip)}
      </ScrollView>

      {/* Category Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map(renderCategoryChip)}
      </ScrollView>

      {/* Results Summary */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
        </Text>
        <TouchableOpacity onPress={() => {
          setSearchQuery('')
          setSelectedFilter('all')
          setSelectedCategory('all')
        }}>
          <Text style={styles.clearFiltersText}>Clear filters</Text>
        </TouchableOpacity>
      </View>

      {/* Expense List */}
      <ScrollView style={styles.expensesList} showsVerticalScrollIndicator={false}>
        {filteredExpenses.length > 0 ? (
          filteredExpenses.map(renderExpenseItem)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>No expenses found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}