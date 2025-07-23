import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { styles } from '@/assets/styles/settle.styles.js'
import { COLORS } from '@/constants/colors'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Page() {
  const router = useRouter()
  const { user } = useUser()
  
  const [selectedTab, setSelectedTab] = useState('you_owe') // you_owe, owed_to_you
  const [userBalances, setUserBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch user balances from backend (same as index.jsx)
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

  // Group balances by type
  const youOweBalances = userBalances.filter(balance => balance.type === "you_owe")
  const owedToYouBalances = userBalances.filter(balance => balance.type === "owes_you")
  
  const currentBalances = selectedTab === 'you_owe' ? youOweBalances : owedToYouBalances
  
  const totalYouOwe = youOweBalances.reduce((sum, balance) => sum + Math.abs(balance.amount), 0)
  const totalOwedToYou = owedToYouBalances.reduce((sum, balance) => sum + balance.amount, 0)

  const handleSettleUp = async (balance) => {
    const isOwing = selectedTab === 'you_owe'
    const actionText = isOwing ? 'pay' : 'record payment from'
    const amount = Math.abs(balance.amount)
    
    Alert.alert(
      'Settle Up',
      `Do you want to ${actionText} ${balance.name} $${amount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Record Payment', 
          onPress: async () => {
            try {
              // TODO: Implement settlement API call
              const userUUID = await AsyncStorage.getItem('userUUID')
              const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL
              
              // For now, just show success and refresh data
              Alert.alert(
                'Payment Recorded',
                `Payment of $${amount.toFixed(2)} has been recorded.`,
                [{ 
                  text: 'OK', 
                  onPress: () => fetchUserBalances() // Refresh data
                }]
              )
            } catch (error) {
              Alert.alert('Error', 'Failed to record payment. Please try again.')
            }
          }
        }
      ]
    )
  }

  const handleSendReminder = (balance) => {
    Alert.alert(
      'Send Reminder',
      `Send a friendly reminder to ${balance.name} about the $${Math.abs(balance.amount).toFixed(2)} they owe you?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Reminder', 
          onPress: () => {
            // TODO: Send reminder notification/email
            Alert.alert(
              'Reminder Sent',
              `Reminder sent to ${balance.name}`,
              [{ text: 'OK' }]
            )
          }
        }
      ]
    )
  }

  const renderBalanceItem = (balance) => {
    const isOwing = selectedTab === 'you_owe'
    const amount = Math.abs(balance.amount)
    
    return (
      <View key={balance.id} style={styles.balanceItem}>
        <View style={styles.balanceHeader}>
          <View style={styles.personInfo}>
            <View style={styles.personAvatar}>
              <Text style={styles.personInitial}>
                {balance.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.personDetails}>
              <Text style={styles.personName}>{balance.name}</Text>
              <Text style={styles.balanceAmount}>
                {isOwing ? 'You owe' : 'Owes you'} ${amount.toFixed(2)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.actionButton,
              { backgroundColor: isOwing ? COLORS.expense : COLORS.income }
            ]}
            onPress={() => handleSettleUp(balance)}
          >
            <Text style={styles.actionButtonText}>
              {isOwing ? 'Pay' : 'Settle'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Note: Expense breakdown would require additional API endpoint for expense details */}
        <View style={styles.expenseBreakdown}>
          <Text style={styles.breakdownTitle}>Balance Details:</Text>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseDescription}>Total balance with {balance.name}</Text>
            <Text style={styles.expenseAmount}>${amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Additional Actions */}
        <View style={styles.additionalActions}>
          <TouchableOpacity 
            style={styles.secondaryAction}
            onPress={() => router.push(`/balance-details/${balance.id}`)}
          >
            <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
            <Text style={styles.secondaryActionText}>View Details</Text>
          </TouchableOpacity>
          
          {!isOwing && (
            <TouchableOpacity 
              style={styles.secondaryAction}
              onPress={() => handleSendReminder(balance)}
            >
              <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
              <Text style={styles.secondaryActionText}>Send Reminder</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.secondaryAction}
            onPress={() => {
              Alert.alert(
                'Partial Settlement',
                `Record a partial payment ${isOwing ? 'to' : 'from'} ${balance.name}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Record Partial', onPress: () => router.push(`/partial-payment/${balance.id}`) }
                ]
              )
            }}
          >
            <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
            <Text style={styles.secondaryActionText}>Partial Payment</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.lastUpdated}>
          Last updated {balance.updated_at ? new Date(balance.updated_at).toLocaleDateString() : 'Recently'}
        </Text>
      </View>
    )
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Settle Up</Text>
          <View style={{width: 24}} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading balances...</Text>
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
          <Text style={styles.title}>Settle Up</Text>
          <View style={{width: 24}} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.expense} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserBalances}>
            <Text style={styles.retryButtonText}>Retry</Text>
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
        <Text style={styles.title}>Settle Up</Text>
        <TouchableOpacity onPress={() => router.push('/payment-history')}>
          <Ionicons name="time-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.oweCard]}>
          <Text style={styles.summaryLabel}>You owe</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.expense }]}>
            ${totalYouOwe.toFixed(2)}
          </Text>
          <Text style={styles.summaryCount}>
            {youOweBalances.length} people
          </Text>
        </View>
        
        <View style={[styles.summaryCard, styles.owedCard]}>
          <Text style={styles.summaryLabel}>You're owed</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.income }]}>
            ${totalOwedToYou.toFixed(2)}
          </Text>
          <Text style={styles.summaryCount}>
            {owedToYouBalances.length} people
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'you_owe' && styles.activeTabButton
          ]}
          onPress={() => setSelectedTab('you_owe')}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'you_owe' && styles.activeTabText
          ]}>
            You Owe ({youOweBalances.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'owed_to_you' && styles.activeTabButton
          ]}
          onPress={() => setSelectedTab('owed_to_you')}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'owed_to_you' && styles.activeTabText
          ]}>
            Owed to You ({owedToYouBalances.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Balances List */}
      <ScrollView style={styles.balancesList} showsVerticalScrollIndicator={false}>
        {currentBalances.length > 0 ? (
          currentBalances.map(renderBalanceItem)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons 
              name="checkmark-circle-outline" 
              size={64} 
              color={COLORS.success} 
            />
            <Text style={styles.emptyStateTitle}>
              {selectedTab === 'you_owe' ? 'You\'re all paid up!' : 'No outstanding payments'}
            </Text>
            <Text style={styles.emptyStateText}>
              {selectedTab === 'you_owe' 
                ? 'You don\'t owe anyone money right now.' 
                : 'Nobody owes you money at the moment.'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Settle All Button */}
      {currentBalances.length > 0 && (
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.settleAllButton}
            onPress={() => {
              const totalAmount = selectedTab === 'you_owe' ? totalYouOwe : totalOwedToYou
              const actionText = selectedTab === 'you_owe' ? 'pay all debts' : 'mark all as settled'
              
              Alert.alert(
                'Settle All',
                `${actionText} for a total of $${totalAmount.toFixed(2)}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Settle All', 
                    onPress: async () => {
                      try {
                        // TODO: Implement settle all API call
                        Alert.alert('Success', 'All balances have been settled!', [
                          { text: 'OK', onPress: () => fetchUserBalances() }
                        ])
                      } catch (error) {
                        Alert.alert('Error', 'Failed to settle balances. Please try again.')
                      }
                    }
                  }
                ]
              )
            }}
          >
            <Text style={styles.settleAllButtonText}>
              {selectedTab === 'you_owe' ? 'Pay All' : 'Settle All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// TODO: Additional API endpoints needed:
// - POST /settlements - record individual settlements
// - POST /settlements/bulk - settle multiple balances at once  
// - GET /balance-details/${balanceId} - get detailed breakdown of balance
// - POST /reminders - send payment reminders
// - POST /partial-payments - record partial payments
// - GET /settlement-history/${userId} - get payment history