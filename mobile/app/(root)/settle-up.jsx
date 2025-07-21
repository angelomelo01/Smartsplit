import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { styles } from '@/assets/styles/settle.styles.js' // You'll need to create this
import { COLORS } from '@/constants/colors'

export default function Page() {
  const router = useRouter()
  const { user } = useUser()
  
  const [selectedTab, setSelectedTab] = useState('you_owe') // you_owe, owed_to_you

  // TODO: Replace with actual database queries
  const outstandingBalances = {
    you_owe: [
      {
        id: 1,
        person: { id: "user2", name: "John Doe", email: "john@example.com" },
        amount: 25.50,
        expenses: [
          { id: 1, description: "Dinner at Pizza Place", amount: 15.20 },
          { id: 2, description: "Coffee", amount: 10.30 }
        ],
        lastUpdated: "2024-01-15"
      },
      {
        id: 2,
        person: { id: "user3", name: "Sarah Smith", email: "sarah@example.com" },
        amount: 42.75,
        expenses: [
          { id: 3, description: "Uber ride", amount: 14.25 },
          { id: 4, description: "Movie tickets", amount: 28.50 }
        ],
        lastUpdated: "2024-01-14"
      }
    ],
    owed_to_you: [
      {
        id: 3,
        person: { id: "user4", name: "Mike Johnson", email: "mike@example.com" },
        amount: 18.60,
        expenses: [
          { id: 5, description: "Groceries", amount: 18.60 }
        ],
        lastUpdated: "2024-01-13"
      },
      {
        id: 4,
        person: { id: "user5", name: "Lisa Brown", email: "lisa@example.com" },
        amount: 67.20,
        expenses: [
          { id: 6, description: "Hotel booking", amount: 50.00 },
          { id: 7, description: "Restaurant bill", amount: 17.20 }
        ],
        lastUpdated: "2024-01-12"
      }
    ]
  }

  const currentBalances = outstandingBalances[selectedTab]
  
  const totalYouOwe = outstandingBalances.you_owe.reduce((sum, balance) => sum + balance.amount, 0)
  const totalOwedToYou = outstandingBalances.owed_to_you.reduce((sum, balance) => sum + balance.amount, 0)

  const handleSettleUp = (balance) => {
    const isOwing = selectedTab === 'you_owe'
    const actionText = isOwing ? 'pay' : 'record payment from'
    
    Alert.alert(
      'Settle Up',
      `Do you want to ${actionText} ${balance.person.name} $${balance.amount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Record Payment', 
          onPress: () => {
            // TODO: Record settlement in database
            Alert.alert(
              'Payment Recorded',
              `Payment of $${balance.amount.toFixed(2)} has been recorded.`,
              [{ text: 'OK' }]
            )
          }
        }
      ]
    )
  }

  const handleSendReminder = (balance) => {
    Alert.alert(
      'Send Reminder',
      `Send a friendly reminder to ${balance.person.name} about the $${balance.amount.toFixed(2)} they owe you?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Reminder', 
          onPress: () => {
            // TODO: Send reminder notification/email
            Alert.alert(
              'Reminder Sent',
              `Reminder sent to ${balance.person.name}`,
              [{ text: 'OK' }]
            )
          }
        }
      ]
    )
  }

  const renderBalanceItem = (balance) => {
    const isOwing = selectedTab === 'you_owe'
    
    return (
      <View key={balance.id} style={styles.balanceItem}>
        <View style={styles.balanceHeader}>
          <View style={styles.personInfo}>
            <View style={styles.personAvatar}>
              <Text style={styles.personInitial}>
                {balance.person.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.personDetails}>
              <Text style={styles.personName}>{balance.person.name}</Text>
              <Text style={styles.balanceAmount}>
                {isOwing ? 'You owe' : 'Owes you'} ${balance.amount.toFixed(2)}
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

        {/* Expense Breakdown */}
        <View style={styles.expenseBreakdown}>
          <Text style={styles.breakdownTitle}>Breakdown:</Text>
          {balance.expenses.map(expense => (
            <View key={expense.id} style={styles.expenseRow}>
              <Text style={styles.expenseDescription}>{expense.description}</Text>
              <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
            </View>
          ))}
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
                `Record a partial payment ${isOwing ? 'to' : 'from'} ${balance.person.name}?`,
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
          Last updated {new Date(balance.lastUpdated).toLocaleDateString()}
        </Text>
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
            {outstandingBalances.you_owe.length} people
          </Text>
        </View>
        
        <View style={[styles.summaryCard, styles.owedCard]}>
          <Text style={styles.summaryLabel}>You're owed</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.income }]}>
            ${totalOwedToYou.toFixed(2)}
          </Text>
          <Text style={styles.summaryCount}>
            {outstandingBalances.owed_to_you.length} people
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
            You Owe ({outstandingBalances.you_owe.length})
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
            Owed to You ({outstandingBalances.owed_to_you.length})
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
                    onPress: () => {
                      // TODO: Settle all balances
                      Alert.alert('Success', 'All balances have been settled!')
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

// TODO: Database queries needed:
// - getOutstandingBalances(userId) - get all unsettled balances for user
// - recordSettlement(balanceId, amount, method) - record a settlement
// - sendPaymentReminder(balanceId) - send reminder to debtor
// - getSettlementHistory(userId) - get payment history
// - recordPartialPayment(balanceId, amount) - record partial settlement
// - calculateOptimalSettlements(userId) - optimize payment chains