"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import SeasonTagEditor from "./SeasonTagEditor";

interface WardrobeItem {
  _id: Id<"wardrobeItems">;
  imageUrl: string;
  name: string;
  category: string;
  colours: string[];
  tags: string[];
  seasonTags: string[];
  dominantColourHex: string;
}

interface ItemDetailSheetProps {
  item: WardrobeItem | null;
  onClose: () => void;
}

export default function ItemDetailSheet({ item, onClose }: ItemDetailSheetProps) {
  const [name, setName] = useState("");
  const [seasonTags, setSeasonTags] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const updateItem = useMutation(api.wardrobe.updateItem);
  const removeItem = useMutation(api.wardrobe.removeItem);

  // Swipe-down-to-close on drag handle
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (delta > 80) onClose();
  }, [onClose]);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setSeasonTags(item.seasonTags);
      setIsEditing(false);
    }
  }, [item]);

  useEffect(() => {
    if (isEditing) nameInputRef.current?.focus();
  }, [isEditing]);

  if (!item) return null;

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    try {
      await updateItem({ itemId: item._id, name, seasonTags });
      setIsEditing(false);
    } catch (err) {
      console.error("ItemDetailSheet.handleSave", item._id, err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!item) return;
    setRemoving(true);
    try {
      await removeItem({ itemId: item._id });
      onClose();
    } catch (err) {
      console.error("ItemDetailSheet.handleRemove", item._id, err);
      setRemoving(false);
    }
  }

  const seasonDotColour = seasonTags.includes("all-season") ? "bg-green-400" : "bg-amber-400";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-surface-container-lowest rounded-t-3xl max-h-[85vh] overflow-y-auto">
        {/* Drag handle — touch here to swipe down and dismiss */}
        <div
          ref={dragHandleRef}
          className="flex justify-center pt-3 pb-4 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-outline-variant rounded-full" />
        </div>

        {/* Image */}
        <div className="mx-4 mt-2 aspect-[3/4] rounded-2xl overflow-hidden bg-surface-container">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="px-4 pb-28 mt-4 space-y-4">
          {/* Name */}
          <div>
            {isEditing ? (
              <input
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                aria-label="Item name"
                className="w-full font-headline text-xl text-on-surface border-b-2 border-primary focus:outline-none pb-1 bg-transparent"
              />
            ) : (
              <p
                className="font-headline text-xl text-on-surface"
                onDoubleClick={() => setIsEditing(true)}
              >
                {item.name}
              </p>
            )}
          </div>

          {/* Category + season indicator */}
          <div className="flex items-center gap-2">
            <span className="font-label text-[10px] tracking-widest uppercase px-2 py-1 bg-surface-container text-on-surface-variant rounded-full capitalize">
              {item.category}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${seasonDotColour}`} />
            <span className="text-xs text-on-surface-variant">
              {seasonTags.length === 0 ? "No season" : seasonTags.join(", ")}
            </span>
          </div>

          {/* Season tags editor */}
          <div>
            <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase mb-2">Season</p>
            <SeasonTagEditor
              seasonTags={seasonTags}
              onChange={(tags) => {
                setSeasonTags(tags);
                if (!isEditing) setIsEditing(true);
              }}
            />
          </div>

          {/* Colour dots */}
          {item.colours.length > 0 && (
            <div>
              <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase mb-2">Colours</p>
              <div className="flex flex-wrap gap-2">
                {item.colours.map((colour) => (
                  <span
                    key={colour}
                    className="text-xs px-2 py-1 bg-surface-container text-on-surface-variant rounded-full capitalize"
                  >
                    {colour}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Style tags */}
          {item.tags.length > 0 && (
            <div>
              <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase mb-2">Style</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-primary-container text-on-primary-container rounded-full capitalize"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isEditing ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-primary text-on-primary rounded-full px-6 py-3 text-sm font-label tracking-wide font-medium active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 border border-outline-variant bg-surface-container-lowest text-on-surface rounded-full px-6 py-3 text-sm"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex-1 border border-error/30 bg-surface-container-lowest text-error rounded-full px-6 py-3 text-sm disabled:opacity-60"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
