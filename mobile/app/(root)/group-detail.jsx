import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { styles } from '@/assets/styles/group-detail.styles.js' // You'll need to create this
import { COLORS } from '@/constants/colors'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function GroupDetailPage() {
  const router = useRouter()
  const { user } = useUser()
  const { id } = useLocalSearchParams() // Get group ID from route params
  
  const [groupData, setGroupData] = useState(null)
  const [groupExpenses, setGroupExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [error, setError] = useState('')
  const [expensesError, setExpensesError] = useState('')

  // Fetch group details from backend
  const fetchGroupDetails = async () => {
    try {
      setLoading(true)
      setError('')
      
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

      const response = await fetch(`${baseUrl}/group/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const group = await response.json()
        setGroupData(group)
      } else if (response.status === 404) {
        setError('Group not found.')
      } else {
        setError(`Failed to load group details: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching group details:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch group expenses from backend
  const fetchGroupExpenses = async () => {
    try {
      setExpensesLoading(true)
      setExpensesError('')
      
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

      const response = await fetch(`${baseUrl}/group/${id}/expenses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const expenses = await response.json()
        setGroupExpenses(expenses)
      } else if (response.status === 404) {
        // No expenses found - this is normal for new groups
        setGroupExpenses([])
      } else {
        setExpensesError(`Failed to load group expenses: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching group expenses:', error)
      setExpensesError('Network error. Please check your connection and try again.')
    } finally {
      setExpensesLoading(false)
    }
  }

  // Fetch data when component mounts
  useEffect(() => {
    if (id) {
      fetchGroupDetails()
      fetchGroupExpenses()
    }
  }, [id])

  const handleLeaveGroup = async () => {
    try {
      const userUUID = await AsyncStorage.getItem('userUUID')
      
      if (!userUUID) {
        Alert.alert('Error', 'User not authenticated. Please sign in again.')
        return
      }

      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL
      
      if (!baseUrl) {
        Alert.alert('Error', 'Server configuration error. Please try again later.')
        return
      }

      const response = await fetch(`${baseUrl}/groups/${id}/leave`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userUUID })
      })

      if (response.ok) {
        Alert.alert(
          'Success', 
          `You have left ${groupData.name}`,
          [{ text: 'OK', onPress: () => router.back() }]
        )
      } else {
        const errorData = await response.json().catch(() => ({}))
        Alert.alert('Error', errorData.message || 'Failed to leave group')
      }
    } catch (error) {
      console.error('Error leaving group:', error)
      Alert.alert('Error', 'Network error. Please try again.')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getCategoryIcon = (categoryId) => {
    const icons = {
      'food': 'restaurant',
      'transport': 'car',
      'entertainment': 'musical-notes',
      'groceries': 'basket',
      'utilities': 'flash',
      'general': 'receipt'
    }
    return icons[categoryId] || 'receipt'
  }

  const renderMember = (member, index) => (
    <View key={member.id || index} style={styles.memberItem}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>
          {member.name ? member.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name || 'Unknown Member'}</Text>
        <Text style={styles.memberEmail}>{member.email || 'No email'}</Text>
      </View>
    </View>
  )

  const renderExpense = (expense) => (
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
        <Text style={styles.expenseDetails}>
          ${expense.amount.toFixed(2)} • Paid by {expense.paidByName || expense.paidBy}
        </Text>
      </View>
      
      <View style={styles.expenseDate}>
        <Text style={styles.expenseDateText}>{formatDate(expense.createdAt || expense.date)}</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
      </View>
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
          <Text style={styles.title}>Group Details</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading group details...</Text>
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
          <Text style={styles.title}>Group Details</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.expense} />
          <Text style={styles.errorTitle}>Unable to load group</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchGroupDetails}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (!groupData) {
    return null
  }

  const totalExpenses = groupExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{groupData.name}</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert(
            'Group Options',
            `Options for ${groupData.name}`,
            [
              { text: 'Edit Group', onPress: () => router.push(`/group/${id}/edit`) },
              { text: 'Leave Group', style: 'destructive', onPress: () => {
                Alert.alert(
                  'Leave Group',
                  `Are you sure you want to leave ${groupData.name}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Leave', style: 'destructive', onPress: handleLeaveGroup }
                  ]
                )
              }},
              { text: 'Cancel', style: 'cancel' }
            ]
          )
        }}>
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Group Info Card */}
      <View style={styles.groupInfoCard}>
        <View style={styles.groupIcon}>
          <Ionicons name="people" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.groupName}>{groupData.name}</Text>
        {groupData.description && (
          <Text style={styles.groupDescription}>{groupData.description}</Text>
        )}
        
        <View style={styles.groupStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{groupData.members?.length || 0}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{groupExpenses.length}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>${totalExpenses.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/add-expense')}
        >
          <Ionicons name="add-circle" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>Add Expense</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/settle-up')}
        >
          <Ionicons name="card" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>Settle Up</Text>
        </TouchableOpacity>
      </View>

      {/* Members Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members ({groupData.members?.length || 0})</Text>
        <View style={styles.membersContainer}>
          {groupData.members && groupData.members.length > 0 ? (
            groupData.members.map(renderMember)
          ) : (
            <Text style={styles.emptyText}>No members in this group</Text>
          )}
        </View>
      </View>

      {/* Expenses Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Expenses ({groupExpenses.length})</Text>
          {groupExpenses.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/history')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {expensesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading expenses...</Text>
          </View>
        ) : expensesError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{expensesError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchGroupExpenses}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : groupExpenses.length > 0 ? (
          groupExpenses.slice(0, 5).map(renderExpense)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyStateText}>No expenses yet</Text>
            <TouchableOpacity 
              style={styles.addFirstExpenseButton}
              onPress={() => router.push('/add-expense')}
            >
              <Text style={styles.addFirstExpenseButtonText}>Add First Expense</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  )
}