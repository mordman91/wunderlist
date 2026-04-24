import AsyncStorage from "@react-native-async-storage/async-storage";
import { Post } from "./classify";

const POSTS_KEY   = "wl_posts";
const STARRED_KEY = "wl_starred";

export async function loadPosts(): Promise<Post[]> {
  try {
    const raw = await AsyncStorage.getItem(POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function savePosts(posts: Post[]): Promise<void> {
  try { await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts)); } catch {}
}

export async function loadStarred(): Promise<Record<string, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(STARRED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function saveStarred(starred: Record<string, boolean>): Promise<void> {
  try { await AsyncStorage.setItem(STARRED_KEY, JSON.stringify(starred)); } catch {}
}

export async function clearAll(): Promise<void> {
  try { await AsyncStorage.multiRemove([POSTS_KEY, STARRED_KEY]); } catch {}
}
