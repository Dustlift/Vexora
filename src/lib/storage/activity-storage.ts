import type { Address } from "viem";
import type { Activity, DeployedNftCollection } from "@/types/activity";

const activityKey = (wallet: Address) => `arc-tools:activities:${wallet.toLowerCase()}`;
const collectionKey = (wallet: Address) => `arc-tools:nft-collections:${wallet.toLowerCase()}`;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getActivities(wallet?: Address) {
  return wallet ? readJson<Activity[]>(activityKey(wallet), []) : [];
}

export function addActivity(wallet: Address, activity: Activity) {
  const next = [activity, ...getActivities(wallet)].slice(0, 100);
  writeJson(activityKey(wallet), next);
  return next;
}

export function getCollections(wallet?: Address) {
  return wallet ? readJson<DeployedNftCollection[]>(collectionKey(wallet), []) : [];
}

export function saveCollection(wallet: Address, collection: DeployedNftCollection) {
  const next = [collection, ...getCollections(wallet)];
  writeJson(collectionKey(wallet), next);
  return next;
}
