import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view"
import { styles } from '@/assets/styles/expense.styles.js'
import { COLORS } from '@/constants/colors'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Page() {
  const router = useRouter()
  const { user } = useUser()
  
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [category, setCategory] = useState('general')
  const [paidBy, setPaidBy] = useState(user?.id)
  const [error, setError] = useState('')
  const [userGroups, setUserGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const categories = [
    { id: 'general', name: 'General', icon: 'receipt' },
    { id: 'food', name: 'Food & Dining', icon: 'restaurant' },
    { id: 'transport', name: 'Transportation', icon: 'car' },
    { id: 'entertainment', name: 'Entertainment', icon: 'musical-notes' },
    { id: 'groceries', name: 'Groceries', icon: 'basket' },
    { id: 'utilities', name: 'Utilities', icon: 'flash' }
  ]

  // Fetch user groups from backend
  const fetchUserGroups = async () => {
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

      const response = await fetch(`${baseUrl}/groups/${userUUID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const groups = await response.json()
        setUserGroups(groups)
      } else if (response.status === 404) {
        // No groups found - this is normal for new users
        setUserGroups([])
      } else {
        setError(`Failed to load groups: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching user groups:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch groups when component mounts
  useEffect(() => {
    fetchUserGroups()
  }, [])

  const handleAddExpense = async () => {
    setError('')
    setSubmitting(true)
    
    if (!description.trim()) {
      setError('Please enter a description')
      setSubmitting(false)
      return
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      setSubmitting(false)
      return
    }
    
    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant')
      setSubmitting(false)
      return
    }

    try {
      // Get user UUID from AsyncStorage
      const userUUID = await AsyncStorage.getItem('userUUID')
      
      if (!userUUID) {
        setError('User not authenticated. Please sign in again.')
        setSubmitting(false)
        return
      }

      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL
      
      if (!baseUrl) {
        setError('Server configuration error. Please try again later.')
        setSubmitting(false)
        return
      }

      const expenseData = {
        description: description.trim(),
        amount: parseFloat(amount),
        groupId: selectedGroup?.id || null,
        participants: selectedParticipants,
        splitType: 'equal', // Always equal split
        category,
        paidBy,
        createdBy: userUUID,
        createdAt: new Date().toISOString()
      }

      const response = await fetch(`${baseUrl}/expense/${userUUID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'description': expenseData.description,
          'amount': expenseData.amount.toString(),
          'groupId': expenseData.groupId || '',
          'participants': JSON.stringify(expenseData.participants),
          'splitType': expenseData.splitType,
          'category': expenseData.category,
          'paidBy': userUUID,
          'createdBy': expenseData.createdBy,
          'createdAt': expenseData.createdAt
        },
        body: JSON.stringify(expenseData)
      })

      if (response.ok) {
        Alert.alert(
          'Success',
          'Expense added successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        )
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.message || `Failed to add expense: ${response.status}`)
      }
    } catch (err) {
      setError('Failed to add expense. Please check your connection and try again.')
      console.error('Error adding expense:', err)
    } finally {
      setSubmitting(false)
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
        <Text style={styles.groupMembers}>
          {group.members?.map(member => member.name || member).join(', ')}
        </Text>
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

  const renderParticipantOption = (participant) => (
    <TouchableOpacity 
      key={participant.id || participant}
      style={[
        styles.participantOption,
        selectedParticipants.includes(participant.id || participant) && styles.selectedParticipantOption
      ]}
      onPress={() => toggleParticipant(participant.id || participant)}
    >
      <View style={styles.participantInfo}>
        <View style={styles.participantAvatar}>
          <Text style={styles.participantInitial}>
            {typeof participant === 'string' 
              ? participant[0].toUpperCase() 
              : participant.name?.[0]?.toUpperCase() || 'U'
            }
          </Text>
        </View>
        <Text style={styles.participantName}>
          {typeof participant === 'string' ? participant : participant.name || 'Unknown'}
        </Text>
      </View>
      {selectedParticipants.includes(participant.id || participant) && (
        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  )

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Expense</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      </View>
    )
  }

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
            {userGroups.length > 0 ? (
              userGroups.map(renderGroupOption)
            ) : (
              <Text style={styles.noGroupsText}>
                No groups available. Create a group first to organize expenses.
              </Text>
            )}
          </View>

          {/* Participants */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who was involved?</Text>
            <Text style={styles.participantNote}>
              {selectedGroup 
                ? `Select from ${selectedGroup.name} members` 
                : 'Select participants'
              }
            </Text>
            <Text style={styles.participantNote}>
              Expense will be split equally among selected participants
            </Text>
            
            {selectedGroup?.members ? (
              selectedGroup.members.map(renderParticipantOption)
            ) : (
              <Text style={styles.noParticipantsText}>
                {selectedGroup 
                  ? 'No members in selected group'
                  : 'Select a group first or add participants manually'
                }
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Add Button */}
        <TouchableOpacity 
          style={[styles.addButton, submitting && styles.addButtonDisabled]} 
          onPress={handleAddExpense}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.addButtonText}>Add Expense</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  )
}