import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view"
import { styles } from '@/assets/styles/expense.styles.js' // You'll need to create this
import { COLORS } from '@/constants/colors'

export default function Page() {
  const router = useRouter()
  const { user } = useUser()
  
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [splitType, setSplitType] = useState('equal') // equal, exact, percentage
  const [category, setCategory] = useState('general')
  const [paidBy, setPaidBy] = useState(user?.id)
  const [error, setError] = useState('')

  // TODO: Replace with actual database queries
  const userGroups = [
    { id: 1, name: "Roommates", members: ["You", "John", "Sarah"] },
    { id: 2, name: "Trip to Vegas", members: ["You", "Mike", "Lisa", "Tom"] },
    { id: 3, name: "Work Lunch", members: ["You", "Anna", "David"] }
  ]

  const categories = [
    { id: 'general', name: 'General', icon: 'receipt' },
    { id: 'food', name: 'Food & Dining', icon: 'restaurant' },
    { id: 'transport', name: 'Transportation', icon: 'car' },
    { id: 'entertainment', name: 'Entertainment', icon: 'musical-notes' },
    { id: 'groceries', name: 'Groceries', icon: 'basket' },
    { id: 'utilities', name: 'Utilities', icon: 'flash' }
  ]

  const splitTypes = [
    { id: 'equal', name: 'Split equally', description: 'Everyone pays the same amount' },
    { id: 'exact', name: 'Split by exact amounts', description: 'Enter exact amount for each person' },
    { id: 'percentage', name: 'Split by percentage', description: 'Enter percentage for each person' }
  ]

  const handleAddExpense = async () => {
    setError('')
    
    if (!description.trim()) {
      setError('Please enter a description')
      return
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant')
      return
    }

    try {
      // TODO: Add expense to database
      // const expenseData = {
      //   description: description.trim(),
      //   amount: parseFloat(amount),
      //   groupId: selectedGroup?.id,
      //   participants: selectedParticipants,
      //   splitType,
      //   category,
      //   paidBy,
      //   createdBy: user.id,
      //   createdAt: new Date()
      // }
      // await addExpense(expenseData)
      
      Alert.alert(
        'Success',
        'Expense added successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      )
    } catch (err) {
      setError('Failed to add expense. Please try again.')
      console.error(err)
    }
  }

  const toggleParticipant = (participantId) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    )
  }

  const renderGroupOption = (group) => (
    <TouchableOpacity 
      key={group.id}
      style={[
        styles.groupOption,
        selectedGroup?.id === group.id && styles.selectedGroupOption
      ]}
      onPress={() => setSelectedGroup(group)}
    >
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.groupMembers}>{group.members.join(', ')}</Text>
      </View>
      {selectedGroup?.id === group.id && (
        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  )

  const renderCategoryOption = (cat) => (
    <TouchableOpacity 
      key={cat.id}
      style={[
        styles.categoryOption,
        category === cat.id && styles.selectedCategoryOption
      ]}
      onPress={() => setCategory(cat.id)}
    >
      <Ionicons 
        name={cat.icon} 
        size={24} 
        color={category === cat.id ? COLORS.primary : COLORS.textLight} 
      />
      <Text style={[
        styles.categoryText,
        category === cat.id && styles.selectedCategoryText
      ]}>
        {cat.name}
      </Text>
    </TouchableOpacity>
  )

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      extraScrollHeight={30}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Expense</Text>
          <View style={{ width: 24 }} />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={COLORS.expense} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError("")}>
              <Ionicons name="close" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        ) : null}

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expense Details</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Description (e.g., Dinner at Joe's)"
              placeholderTextColor={COLORS.textLight}
              value={description}
              onChangeText={setDescription}
            />
            
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textLight}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map(renderCategoryOption)}
              </View>
            </ScrollView>
          </View>

          {/* Group Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Group (Optional)</Text>
            {userGroups.map(renderGroupOption)}
          </View>

          {/* Participants */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who was involved?</Text>
            {/* TODO: If group selected, show group members. Otherwise, show friend list */}
            <Text style={styles.participantNote}>
              {selectedGroup 
                ? `Select from ${selectedGroup.name} members` 
                : 'Select participants from your friends'
              }
            </Text>
            {/* Participant selection UI would go here */}
          </View>

          {/* Split Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How to split?</Text>
            {splitTypes.map(split => (
              <TouchableOpacity 
                key={split.id}
                style={[
                  styles.splitOption,
                  splitType === split.id && styles.selectedSplitOption
                ]}
                onPress={() => setSplitType(split.id)}
              >
                <View style={styles.splitInfo}>
                  <Text style={styles.splitName}>{split.name}</Text>
                  <Text style={styles.splitDescription}>{split.description}</Text>
                </View>
                {splitType === split.id && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
          <Text style={styles.addButtonText}>Add Expense</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  )
}

// TODO: Database queries needed:
// - getUserGroups(userId) - get all groups user belongs to
// - getGroupMembers(groupId) - get all members of a specific group  
// - getUserFriends(userId) - get user's friend list
// - addExpense(expenseData) - create new expense record
// - splitExpense(expenseId, participants, splitType) - handle expense splitting logic