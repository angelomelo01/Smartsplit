import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { styles } from '@/assets/styles/index.styles.js'
import { COLORS } from '@/constants/colors'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Page() {
  const router = useRouter()
  const { user } = useUser()

  const [userBalances, setUserBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // TODO: Replace with actual database queries
  const recentExpenses = [
    { id: 1, description: "Dinner at Pizza Place", amount: 45.60, date: "Today", paidBy: "You" },
    { id: 2, description: "Uber ride", amount: 18.30, date: "Yesterday", paidBy: "John" },
    { id: 3, description: "Groceries", amount: 127.85, date: "2 days ago", paidBy: "Sarah" }
  ]

  // Fetch user balances from backend
  const fetchUserBalances = async () => {
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

      const response = await fetch(`${baseUrl}/balances/${userUUID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const balances = await response.json()
        setUserBalances(balances)
      } else if (response.status === 404) {
        // No balances found - this is normal for new users
        setUserBalances([])
      } else {
        setError(`Failed to load balances: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching user balances:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch balances when component mounts
  useEffect(() => {
    fetchUserBalances()
  }, [])

  const totalYouOwe = userBalances
    .filter(balance => balance.type === "you_owe")
    .reduce((sum, balance) => sum + Math.abs(balance.amount), 0)
    
  const totalOwedToYou = userBalances
    .filter(balance => balance.type === "owes_you")
    .reduce((sum, balance) => sum + balance.amount, 0)

  const renderBalanceItem = (balance) => (
    <TouchableOpacity key={balance.id} style={styles.balanceItem}>
      <View style={styles.balanceInfo}>
        <Text style={styles.balanceName}>{balance.name}</Text>
        <Text style={[
          styles.balanceAmount, 
          { color: balance.type === "owes_you" ? COLORS.income : COLORS.expense }
        ]}>
          {balance.type === "owes_you" ? "owes you" : "you owe"} ${Math.abs(balance.amount).toFixed(2)}
        </Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={COLORS.textLight} 
      />
    </TouchableOpacity>
  )

  const renderExpenseItem = (expense) => (
    <TouchableOpacity key={expense.id} style={styles.expenseItem}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDescription}>{expense.description}</Text>
        <Text style={styles.expenseDetails}>
          ${expense.amount.toFixed(2)} • Paid by {expense.paidBy} • {expense.date}
        </Text>
      </View>
    </TouchableOpacity>
  )

  // Show loading state for balances section
  const renderBalancesContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading balances...</Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={COLORS.expense} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserBalances}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (userBalances.length > 0) {
      return userBalances.slice(0, 3).map(renderBalanceItem)
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
        <Text style={styles.emptyStateText}>You're all settled up!</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.firstName || 'User'}!</Text>
          <Text style={styles.subtitle}>Here's your expense summary</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="person-circle-outline" size={32} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Balance Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.oweCard]}>
          <Text style={styles.summaryLabel}>You owe</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.expense }]}>
            ${loading ? '...' : totalYouOwe.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryCard, styles.owedCard]}>
          <Text style={styles.summaryLabel}>You're owed</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.income }]}>
            ${loading ? '...' : totalOwedToYou.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/add-expense')}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Add Expense</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/groups')}
        >
          <Ionicons name="people" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Groups</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/settle-up')}
        >
          <Ionicons name="card" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Settle Up</Text>
        </TouchableOpacity>
      </View>

      {/* Outstanding Balances */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Outstanding Balances</Text>
          <TouchableOpacity onPress={() => router.push('/balances')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        
        {renderBalancesContent()}
      </View>

      {/* Recent Expenses */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          <TouchableOpacity onPress={() => router.push('/history')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        
        {recentExpenses.map(renderExpenseItem)}
      </View>
    </ScrollView>
  )
}

// TODO: Database queries needed:
// - getRecentExpenses(userId, limit) - get recent expenses involving user