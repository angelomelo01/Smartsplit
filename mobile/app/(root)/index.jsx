import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser, useAuth } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { styles } from '@/assets/styles/index.styles.js'
import { COLORS } from '@/constants/colors'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Page() {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useAuth()

  const [userBalances, setUserBalances] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [error, setError] = useState('')
  const [expensesError, setExpensesError] = useState('')

  // Handle sign out
  const handleSignOut = async () => {
    try {
      // Clear AsyncStorage
      await AsyncStorage.removeItem('userUUID')
      // Sign out with Clerk
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      Alert.alert('Error', 'Failed to sign out. Please try again.')
    }
  }

  // Show profile menu with sign out option
  const showProfileMenu = () => {
    Alert.alert(
      'Profile Menu',
      'Choose an option',
      [
        { text: 'View Profile', onPress: () => router.push('/profile') },
        { text: 'Settings', onPress: () => router.push('/settings') },
        { text: 'Sign Out', onPress: handleSignOut, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    )
  }

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

  // Fetch recent expenses from backend
  const fetchRecentExpenses = async () => {
    try {
      setExpensesLoading(true)
      setExpensesError('')
      
      // Get user UUID from AsyncStorage
      const userUUID = await AsyncStorage.getItem('userUUID')
      
      if (!userUUID) {
        setExpensesError('User not authenticated. Please sign in again.')
        return
      }

      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL
      
      if (!baseUrl) {
        setExpensesError('Server configuration error. Please try again later.')
        return
      }

      const response = await fetch(`${baseUrl}/recent-expense/${userUUID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const expenses = await response.json()
        setRecentExpenses(expenses)
      } else if (response.status === 404) {
        // No recent expenses found - this is normal for new users
        setRecentExpenses([])
      } else {
        setExpensesError(`Failed to load recent expenses: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching recent expenses:', error)
      setExpensesError('Network error. Please check your connection and try again.')
    } finally {
      setExpensesLoading(false)
    }
  }

  // Fetch both balances and expenses when component mounts
  useEffect(() => {
    fetchUserBalances()
    fetchRecentExpenses()
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
          {error.includes('not authenticated') && (
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out & Try Again</Text>
            </TouchableOpacity>
          )}
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

  // Show loading/error state for recent expenses section
  const renderRecentExpensesContent = () => {
    if (expensesLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading recent expenses...</Text>
        </View>
      )
    }

    if (expensesError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={COLORS.expense} />
          <Text style={styles.errorText}>{expensesError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRecentExpenses}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          {expensesError.includes('not authenticated') && (
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out & Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      )
    }

    if (recentExpenses.length > 0) {
      return recentExpenses.map(renderExpenseItem)
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
        <Text style={styles.emptyStateText}>No recent expenses</Text>
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
          onPress={showProfileMenu}
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
        
        {renderRecentExpensesContent()}
      </View>
    </ScrollView>
  )
}