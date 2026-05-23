"use client";

import { useAuth } from "@/context/AuthContext";
import ProfileSetupModal from "./ProfileSetupModal";

/** Shows the profile-setup modal when user is logged in but hasn't set a nickname yet. */
export default function AuthGate() {
  const { user, profile, loading, autoCreating } = useAuth();
  if (loading || autoCreating || !user || profile) return null;
  return <ProfileSetupModal />;
}
