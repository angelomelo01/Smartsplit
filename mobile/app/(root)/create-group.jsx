import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS } from '@/constants/colors'

export default function CreateGroup() {
  const router = useRouter()
  const { user } = useUser()
  
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [memberEmails, setMemberEmails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validateEmails = (emailString) => {
    if (!emailString.trim()) return []
    
    const emails = emailString.split(',').map(email => email.trim()).filter(email => email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emails.filter(email => !emailRegex.test(email))
    
    if (invalidEmails.length > 0) {
      setError(`Invalid email addresses: ${invalidEmails.join(', ')}`)
      return null
    }
    
    return emails
  }

  const validateForm = () => {
    if (!groupName.trim()) {
      setError('Group name is required')
      return false
    }
    if (groupName.trim().length < 2) {
      setError('Group name must be at least 2 characters long')
      return false
    }
    if (groupName.trim().length > 50) {
      setError('Group name must be less than 50 characters')
      return false
    }
    if (groupDescription.trim().length > 200) {
      setError('Description must be less than 200 characters')
      return false
    }
    
    // Validate member emails if provided
    if (memberEmails.trim()) {
      const validatedEmails = validateEmails(memberEmails)
      if (validatedEmails === null) {
        return false
      }
    }
    
    return true
  }

  const handleCreateGroup = async () => {
    if (!validateForm()) {
      return
    }

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

      // Parse member emails
      const emailList = memberEmails.trim() ? validateEmails(memberEmails) : []
      if (memberEmails.trim() && emailList === null) {
        return // Email validation failed
      }

      // Format members array for backend
      const members = emailList.map(email => ({ email: email }))

      // Prepare group data according to backend API structure
      const groupData = {
        name: groupName.trim(),
        description: groupDescription.trim() || '',
        members: members,
        created_by: userUUID,
        created_at: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
        recent_activity: 'Group created'
      }

      console.log('Creating group with data:', groupData)

      const response = await fetch(`${baseUrl}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData)
      })

      if (response.ok) {
        const createdGroup = await response.json()
        console.log('Group created successfully:', createdGroup)
        
        Alert.alert(
          'Success!',
          `Group "${groupName}" has been created successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to the newly created group or back to groups list
                if (createdGroup.id) {
                  router.replace(`/group/${createdGroup.id}`)
                } else {
                  router.back()
                }
              }
            }
          ]
        )
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.message || `Failed to create group: ${response.status}`)
        console.error('Error creating group:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error creating group:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (groupName.trim() || groupDescription.trim()) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      )
    } else {
      router.back()
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Group</Text>
        <TouchableOpacity 
          onPress={handleCreateGroup}
          disabled={loading || !groupName.trim()}
          style={[
            styles.saveButton,
            (!groupName.trim() || loading) && styles.saveButtonDisabled
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={[
              styles.saveButtonText,
              (!groupName.trim() || loading) && styles.saveButtonTextDisabled
            ]}>
              Create
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.expense} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Group Icon Section */}
        <View style={styles.iconSection}>
          <View style={styles.groupIconLarge}>
            <Ionicons name="people" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.iconLabel}>Group Icon</Text>
          <Text style={styles.iconSubLabel}>Default icon will be used</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Group Name *</Text>
            <TextInput
              style={[styles.textInput, error && !groupName.trim() && styles.textInputError]}
              placeholder="Enter group name"
              placeholderTextColor={COLORS.textLight}
              value={groupName}
              onChangeText={(text) => {
                setGroupName(text)
                if (error && text.trim()) {
                  setError('')
                }
              }}
              maxLength={50}
              editable={!loading}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.inputHint}>This will be visible to all group members</Text>
              <Text style={styles.characterCount}>{groupName.length}/50</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="What's this group for? (e.g., 'Weekend trip to mountains', 'Roommate expenses')"
              placeholderTextColor={COLORS.textLight}
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
              editable={!loading}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.inputHint}>Help members understand the group's purpose</Text>
              <Text style={styles.characterCount}>{groupDescription.length}/200</Text>
            </View>
          </View>
        </View>

        {/* Group Settings Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Group Settings</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Currency</Text>
              <Text style={styles.settingValue}>USD ($)</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacy</Text>
              <Text style={styles.settingValue}>Invitation only</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
          </View>
          <Text style={styles.settingNote}>
            You can change these settings after creating the group
          </Text>
        </View>

        {/* Create Button (Alternative placement) */}
        <TouchableOpacity 
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateGroup}
          disabled={loading || !groupName.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>Create Group</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textLight,
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBackground,
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  errorText: {
    color: COLORS.expense,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  iconSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  groupIconLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  iconSubLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  formSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  textInputError: {
    borderColor: COLORS.expense,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textLight,
    flex: 1,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  previewSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  settingNote: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 12,
    fontStyle: 'italic',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.textLight,
    opacity: 0.5,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}