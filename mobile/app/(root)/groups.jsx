import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { styles } from '@/assets/styles/groups.styles.js'
import { COLORS } from '@/constants/colors'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback } from 'react'

export default function Page() {
  const router = useRouter()
  const { user } = useUser()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [userGroups, setUserGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  // Refresh groups when screen comes into focus (after creating/editing groups)
  useFocusEffect(
    useCallback(() => {
      fetchUserGroups()
    }, [])
  )

  // Retry function for error states
  const handleRetry = () => {
    fetchUserGroups()
  }

  const filteredGroups = userGroups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateGroup = () => {
    router.push('/create-group')
  }

  const handleJoinGroup = () => {
    Alert.alert(
      'Join Group',
      'Enter the group invite code or link',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enter Code', onPress: () => router.push('/join-group') }
      ]
    )
  }

  const handleLeaveGroup = async (groupId, groupName) => {
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

      const response = await fetch(`${baseUrl}/groups/${groupId}/leave`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userUUID })
      })

      if (response.ok) {
        Alert.alert('Success', `You have left ${groupName}`)
        fetchUserGroups() // Refresh the groups list
      } else {
        const errorData = await response.json().catch(() => ({}))
        Alert.alert('Error', errorData.message || 'Failed to leave group')
      }
    } catch (error) {
      console.error('Error leaving group:', error)
      Alert.alert('Error', 'Network error. Please try again.')
    }
  }

  const renderGroupItem = (group) => (
    <TouchableOpacity 
      key={group.id}
      style={styles.groupItem}
      onPress={() => router.push(`/group/${group.id}`)}
    >
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Ionicons name="people" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupDescription}>{group.description}</Text>
        </View>
        <TouchableOpacity 
          style={styles.groupMenuButton}
          onPress={() => {
            Alert.alert(
              'Group Options',
              `Options for ${group.name}`,
              [
                { text: 'View Details', onPress: () => router.push(`/group/${group.id}`) },
                { text: 'Edit Group', onPress: () => router.push(`/group/${group.id}/edit`) },
                { text: 'Leave Group', style: 'destructive', onPress: () => {
                  Alert.alert(
                    'Leave Group',
                    `Are you sure you want to leave ${group.name}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Leave', style: 'destructive', onPress: () => {
                        handleLeaveGroup(group.id, group.name)
                      }}
                    ]
                  )
                }},
                { text: 'Cancel', style: 'cancel' }
              ]
            )
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.groupStats}>
        <View style={styles.groupStat}>
          <Text style={styles.groupStatNumber}>{group.members?.length || 0}</Text>
          <Text style={styles.groupStatLabel}>Members</Text>
        </View>
        <View style={styles.groupStat}>
          <Text style={styles.groupStatNumber}>${(group.totalExpenses || 0).toFixed(2)}</Text>
          <Text style={styles.groupStatLabel}>Total Expenses</Text>
        </View>
      </View>

      <View style={styles.groupFooter}>
        <Text style={styles.groupActivity}>{group.recentActivity || 'No recent activity'}</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
      </View>

      <View style={styles.groupMembers}>
        {group.members?.slice(0, 4).map((member, index) => (
          <View key={member.id || index} style={[styles.memberAvatar, { zIndex: 4 - index }]}>
            <Text style={styles.memberInitial}>
              {member.name ? member.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
            </Text>
          </View>
        ))}
        {group.members && group.members.length > 4 && (
          <View style={styles.memberCount}>
            <Text style={styles.memberCountText}>+{group.members.length - 4}</Text>
          </View>
        )}
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
          <Text style={styles.title}>Groups</Text>
          <TouchableOpacity onPress={handleCreateGroup}>
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your groups...</Text>
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
          <Text style={styles.title}>Groups</Text>
          <TouchableOpacity onPress={handleCreateGroup}>
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.expense} />
          <Text style={styles.errorTitle}>Unable to load groups</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
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
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity onPress={handleCreateGroup}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups..."
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

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCreateGroup}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Create Group</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleJoinGroup}>
          <Ionicons name="person-add-outline" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Join Group</Text>
        </TouchableOpacity>
      </View>

      {/* Groups List */}
      <ScrollView style={styles.groupsList} showsVerticalScrollIndicator={false}>
        {filteredGroups.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>
              Your Groups ({filteredGroups.length})
            </Text>
            {filteredGroups.map(renderGroupItem)}
          </>
        ) : searchQuery.length > 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>No groups found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your search terms
            </Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>No groups yet</Text>
            <Text style={styles.emptyStateText}>
              Create a group to start splitting expenses with friends
            </Text>
            <TouchableOpacity style={styles.createFirstGroupButton} onPress={handleCreateGroup}>
              <Text style={styles.createFirstGroupButtonText}>Create Your First Group</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// TODO: Database queries needed:
// - joinGroup(userId, inviteCode) - join group via invite code
// - updateGroup(groupId, updates) - update group details