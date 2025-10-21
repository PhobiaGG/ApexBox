import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, FONT_SIZE } from '../constants/theme';

interface UserAvatarProps {
  uri: string | null;
  name: string;
  size?: number;
  borderColor?: string;
}

export default function UserAvatar({ uri, name, size = 80, borderColor = COLORS.cyan }: UserAvatarProps) {
  const getInitials = (fullName: string): string => {
    // Handle undefined, null, or empty names
    if (!fullName || typeof fullName !== 'string') return '?';
    
    const names = fullName.trim().split(' ');
    if (names.length === 0 || !names[0]) return '?';
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name || 'User');
  const fontSize = size * 0.4;

  if (uri) {
    return (
      <View style={[styles.container, { width: size, height: size, borderColor, borderWidth: 3 }]}>
        <Image source={{ uri }} style={styles.image} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        styles.placeholder,
        { width: size, height: size, borderColor, borderWidth: 3 },
      ]}
    >
      <Text style={[styles.initials, { fontSize, color: borderColor }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 1000,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: COLORS.card,
  },
  initials: {
    fontWeight: 'bold',
  },
});
