import React, { createContext, useState } from "react";

import {
  EducationLevel,
  ExperienceLevel,
  StartingSituation,
  TargetTimeframe,
} from "../types/careerContext";

export interface UserData {
  /** The signed-in user's id, or null before it's known. Scopes the local
   * roadmap/decision cache so two accounts on the same device never collide. */
  userId: string | null;

  userType: string;
  name: string;
  goal: string;
  country: string;

  currentRole: string;
  currentOccupationId: string | null;
  currentSalary: string;

  targetRole: string;
  targetOccupationId: string | null;
  targetSalary: string;

  startingSituation: StartingSituation | "";
  experienceLevel: ExperienceLevel | "";
  educationLevel: EducationLevel | "";
  skills: string[];
  targetTimeframe: TargetTimeframe | "";

  profileLoaded: boolean;
}

interface UserContextType {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  clearUserData: () => void;
}

export const UserContext = createContext<UserContextType>(
  {} as UserContextType,
);

const defaultUser: UserData = {
  userId: null,

  userType: "",
  name: "",
  goal: "",
  country: "",

  currentRole: "",
  currentOccupationId: null,
  currentSalary: "",

  targetRole: "",
  targetOccupationId: null,
  targetSalary: "",

  startingSituation: "",
  experienceLevel: "",
  educationLevel: "",
  skills: [],
  targetTimeframe: "",

  profileLoaded: false,
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData>(defaultUser);

  const clearUserData = () => {
    setUserData(defaultUser);
  };

  return (
    <UserContext.Provider
      value={{
        userData,
        setUserData,
        clearUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
