import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { styles } from '@/assets/styles/history.styles.js' // You'll need to create this
import { COLORS } from '@/constants/colors'

export default function Page() {
  const router = useRouter()
  const { user } = useUser()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all') // all, paid_by_you, paid_by_others
  const [selectedCategory, setSelectedCategory] = useState('all')

  // TODO: Replace with actual database queries
  const expenseHistory = [
    {
      id: 1,
      description: "Dinner at Pizza Palace",
      amount: 45.60,
      date: "2024-01-15",
      category: "food",
      paidBy: { id: "user1", name: "You" },
      participants: ["You", "John", "Sarah"],
      group: { id: 1, name: "Roommates" },
      yourShare: 15.20,
      settled: false
    },
    {
      id: 2,
      description: "Uber ride to airport",
      amount: 28.50,
      date: "2024-01-14",
      category: "transport",
      paidBy: { id: "user2", name: "John" },
      participants: ["You", "John"],
      group: null,
      yourShare: 14.25,
      settled: true
    },
    {
      id: 3,
      description: "Groceries - weekly shopping",
      amount: 127.85,
      date: "2024-01-13",
      category: "groceries",
      paidBy: { id: "user1", name: "You" },
      participants: ["You", "John", "Sarah", "Mike"],
      group: { id: 1, name: "Roommates" },
      yourShare: 31.96,
      settled: false
    },
    {
      id: 4,
      description: "Movie tickets",
      amount: 36.00,
      date: "2024-01-12",
      category: "entertainment",
      paidBy: { id: "user3", name: "Sarah" },
      participants: ["You", "Sarah", "Mike"],
      group: null,
      yourShare: 12.00,
      settled: true
    }
  ]

  const categories = [
    { id: 'all', name: 'All Categories', icon: 'apps' },
    { id: 'food', name: 'Food & Dining', icon: 'restaurant' },
    { id: 'transport', name: 'Transportation', icon: 'car' },
    { id: 'entertainment', name: 'Entertainment', icon: 'musical-notes' },
    { id: 'groceries', name: 'Groceries', icon: 'basket' },
    { id: 'utilities', name: 'Utilities', icon: 'flash' }
  ]

  const filters = [
    { id: 'all', name: 'All Expenses' },
    { id: 'paid_by_you', name: 'Paid by You' },
    { id: 'paid_by_others', name: 'Paid by Others' }
  ]

  const filteredExpenses = expenseHistory.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'paid_by_you' && expense.paidBy.name === 'You') ||
      (selectedFilter === 'paid_by_others' && expense.paidBy.name !== 'You')
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
    <TouchableOpacity 
      key={expense.id} 
      style={styles.expenseItem}
      onPress={() => router.push(`/expense/${expense.id}`)}
    >
      <View style={styles.expenseIconContainer}>
        <Ionicons 
          name={getCategoryIcon(expense.category)} 
          size={24} 
          color={COLORS.primary} 
        />
      </View>
      
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDescription}>{expense.description}</Text>
        <View style={styles.expenseDetails}>
          <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
          <Text style={styles.expenseDivider}>•</Text>
          <Text style={styles.expensePaidBy}>Paid by {expense.paidBy.name}</Text>
          {expense.group && (
            <>
              <Text style={styles.expenseDivider}>•</Text>
              <Text style={styles.expenseGroup}>{expense.group.name}</Text>
            </>
          )}
        </View>
        <Text style={styles.expenseParticipants}>
          {expense.participants.join(', ')}
        </Text>
      </View>
      
      <View style={styles.expenseAmounts}>
        <Text style={styles.expenseTotal}>${expense.amount.toFixed(2)}</Text>
        <Text style={[
          styles.expenseShare,
          { color: expense.paidBy.name === 'You' ? COLORS.income : COLORS.expense }
        ]}>
          Your share: ${expense.yourShare.toFixed(2)}
        </Text>
        {expense.settled && (
          <View style={styles.settledBadge}>
            <Text style={styles.settledText}>Settled</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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

// TODO: Database queries needed:
// - getExpenseHistory(userId, filters) - get paginated expense history with filters
// - searchExpenses(userId, query) - search expenses by description
// - getExpensesByCategory(userId, category) - filter expenses by category
// - getExpensesByDateRange(userId, startDate, endDate) - filter by date range
// - getExpenseDetails(expenseId) - get detailed expense information