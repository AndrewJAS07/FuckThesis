import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, CreditCard, Shield, CircleHelp as HelpCircle, LogOut, ChevronRight, Star, Car } from 'lucide-react-native';
import { signOut } from '@/lib/supabase';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, userType } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const handleSignOut = async () => {
    try {
      setLoading(true);
      
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLoading(false),
          },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              const { error } = await signOut();
              
              if (error) {
                Alert.alert('Error', error.message);
                return;
              }
              
              router.replace('/');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const getInitials = () => {
    const firstName = user?.firstName || '';
    const lastName = user?.lastName || '';
    
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.profilePicture ? (
              <Image
                source={{ uri: user.profilePicture }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.initialsContainer}>
                <Text style={styles.initialsText}>{getInitials()}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.userTypeContainer}>
              <Text style={styles.userTypeText}>
                {userType === 'commuter' ? 'Commuter' : 'Driver'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        {userType === 'driver' && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.92</Text>
              <View style={styles.statLabelContainer}>
                <Star size={14} color={colors.accent.amber} />
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>243</Text>
              <Text style={styles.statLabel}>Rides</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Months</Text>
            </View>
          </View>
        )}
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <User size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Personal Information</Text>
              <ChevronRight size={20} color={colors.gray[400]} />
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <CreditCard size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Payment Methods</Text>
              <ChevronRight size={20} color={colors.gray[400]} />
            </TouchableOpacity>
            
            {userType === 'driver' && (
              <>
                <View style={styles.menuDivider} />
                
                <TouchableOpacity style={styles.menuItem}>
                  <View style={styles.menuIconContainer}>
                    <Car size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.menuItemText}>Vehicle Information</Text>
                  <ChevronRight size={20} color={colors.gray[400]} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <Settings size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>App Settings</Text>
              <ChevronRight size={20} color={colors.gray[400]} />
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <Shield size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Privacy & Security</Text>
              <ChevronRight size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <HelpCircle size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Help Center</Text>
              <ChevronRight size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={loading}
        >
          <LogOut size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  initialsContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  userTypeContainer: {
    backgroundColor: colors.gray[200],
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: '500',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: 24,
    padding: 16,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.gray[200],
    marginHorizontal: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.text.primary,
  },
  menuCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginLeft: 56,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 16,
  },
  signOutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.secondary,
  },
});