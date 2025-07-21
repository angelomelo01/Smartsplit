import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { styles } from '@/assets/styles/index.styles.js' // You'll need to create this
import { COLORS } from '@/constants/colors'

export default function Page() {
  const router = useRouter()
  const { user } = useUser()

  // TODO: Replace with actual database queries
  const userBalances = [
    { id: 1, name: "John Doe", amount: 25.50, type: "owes_you" },
    { id: 2, name: "Sarah Smith", amount: -15.75, type: "you_owe" },
    { id: 3, name: "Mike Johnson", amount: 8.25, type: "owes_you" }
  ]
  
  const recentExpenses = [
    { id: 1, description: "Dinner at Pizza Place", amount: 45.60, date: "Today", paidBy: "You" },
    { id: 2, description: "Uber ride", amount: 18.30, date: "Yesterday", paidBy: "John" },
    { id: 3, description: "Groceries", amount: 127.85, date: "2 days ago", paidBy: "Sarah" }
  ]

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
            ${totalYouOwe.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryCard, styles.owedCard]}>
          <Text style={styles.summaryLabel}>You're owed</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.income }]}>
            ${totalOwedToYou.toFixed(2)}
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
        
        {userBalances.length > 0 ? (
          userBalances.slice(0, 3).map(renderBalanceItem)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            <Text style={styles.emptyStateText}>You're all settled up!</Text>
          </View>
        )}
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
// - getUserBalances(userId) - get all outstanding balances for user
// - getRecentExpenses(userId, limit) - get recent expenses involving user
// - getTotalOwed(userId) - calculate total amount user owes
// - getTotalOwedToUser(userId) - calculate total amount owed to user