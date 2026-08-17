/**
 * Utilitaire centralisé pour l'affichage des noms d'utilisateurs.
 * Résout le problème des multiples représentations et garantit un format standard "Prénom Nom (ROLE)".
 */

export interface UserProfile {
  id: string
  full_name?: string | null
  email?: string | null
}

export interface TeamMember {
  user_id: string
  role?: string
  profiles?: UserProfile | null
}

/**
 * Retourne le nom d'affichage formaté d'un utilisateur.
 * Fallback : full_name -> email -> "Utilisateur inconnu"
 */
export function getUserDisplayName(profile?: UserProfile | null): string {
  if (!profile) return 'Utilisateur inconnu'
  return profile.full_name || profile.email || 'Utilisateur inconnu'
}

/**
 * Retourne le nom d'affichage formaté d'un membre de l'équipe, incluant son rôle.
 * Exemple: "Bayo Kassim (PROJECT_MANAGER)"
 */
export function getTeamMemberDisplayName(member: TeamMember, allMembers?: TeamMember[]): string {
  const baseName = getUserDisplayName(member.profiles)
  const roleStr = member.role ? ` (${member.role})` : ''

  // Gestion des doublons (si deux membres différents ont le même full_name)
  if (allMembers && member.profiles?.full_name) {
    const duplicates = allMembers.filter(
      (m) => m.profiles?.full_name === member.profiles?.full_name && m.user_id !== member.user_id
    )
    if (duplicates.length > 0) {
      // Disambiguate using email if it exists
      const disambiguator = member.profiles.email ? ` [${member.profiles.email}]` : ` [ID: ${member.user_id.slice(0, 4)}]`
      return `${baseName}${disambiguator}${roleStr}`
    }
  }

  return `${baseName}${roleStr}`
}
