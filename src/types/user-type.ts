import { Profile, User } from "./auth-types";

export interface markAccountActionVerified {
  full_name: string;
  email: string;
  password: string;
}

export type CreateVerifiedAccountResult = {
  user: User;
  profile: Profile;
};
