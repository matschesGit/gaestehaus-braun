"use client";

import Image from "next/image";
import { useState } from "react";

type Photo = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
};

type Apartment = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  basePriceCents: number;
  sortOrder: number;
  isActive: boolean;
  photos: Photo[];
};

type ApartmentForm = {
  title: string;
  shortDescription: string;
  description: string;
  basePriceCents: string;
  sortOrder: string;
  isActive: boolean;
  photos: Array<{ url: string; alt: string }>;
};

function toSmallVariant(url: string) {
  if (url.includes("-lg.")) {
    return url.replace("-lg.", "-sm.");
  }
  return url;
}

function toForm(apartment: Apartment): ApartmentForm {
  return {
    title: apartment.title,
    shortDescription: apartment.shortDescription ?? "",
    description: apartment.description,
    basePriceCents: String(apartment.basePriceCents),
    sortOrder: String(apartment.sortOrder),
    isActive: apartment.isActive,
    photos: [...apartment.photos]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((photo) => ({
        url: photo.url,
        alt: photo.alt ?? "",
      })),
  };
}

export default function ApartmentsManager({ initialApartments }: { initialApartments: Apartment[] }) {
  const [apartments, setApartments] = useState<Apartment[]>(initialApartments);
  const [newForm, setNewForm] = useState<ApartmentForm>({
    title: "",
    shortDescription: "",
    description: "",
    basePriceCents: "9500",
    sortOrder: String(initialApartments.length + 1),
    isActive: true,
    photos: [],
  });
  const [editForms, setEditForms] = useState<Record<string, ApartmentForm>>(
    Object.fromEntries(initialApartments.map((apartment) => [apartment.id, toForm(apartment)])),
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  function uploadImagesWithProgress(
    files: FileList | File[],
    onProgress: (percent: number) => void,
  ): Promise<Array<{ url: string; name: string }>> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/apartments/upload");

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(data.error ?? "Upload fehlgeschlagen."));
            return;
          }
          resolve((data.files ?? []) as Array<{ url: string; name: string }>);
        } catch {
          reject(new Error("Ungültige Serverantwort beim Upload."));
        }
      };

      xhr.onerror = () => reject(new Error("Upload fehlgeschlagen."));
      xhr.send(formData);
    });
  }

  async function uploadImages(files: FileList | File[], apartmentId?: string) {
    const uploaded = await uploadImagesWithProgress(files, setUploadProgress);
    const uploadedPhotos = uploaded.map((file) => ({
      url: file.url,
      alt: "",
    }));

    if (apartmentId) {
      setEditForms((prev) => ({
        ...prev,
        [apartmentId]: {
          ...prev[apartmentId],
          photos: [...prev[apartmentId].photos, ...uploadedPhotos],
        },
      }));
    } else {
      setNewForm((prev) => ({
        ...prev,
        photos: [...prev.photos, ...uploadedPhotos],
      }));
    }
  }

  function removePhoto(apartmentId: string | null, index: number) {
    if (apartmentId) {
      setEditForms((prev) => ({
        ...prev,
        [apartmentId]: {
          ...prev[apartmentId],
          photos: prev[apartmentId].photos.filter((_, i) => i !== index),
        },
      }));
      return;
    }

    setNewForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }

  function movePhoto(apartmentId: string | null, index: number, direction: -1 | 1) {
    const move = (photos: Array<{ url: string; alt: string }>) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= photos.length) return photos;
      const next = [...photos];
      const [photo] = next.splice(index, 1);
      next.splice(nextIndex, 0, photo);
      return next;
    };

    if (apartmentId) {
      setEditForms((prev) => ({
        ...prev,
        [apartmentId]: {
          ...prev[apartmentId],
          photos: move(prev[apartmentId].photos),
        },
      }));
      return;
    }

    setNewForm((prev) => ({
      ...prev,
      photos: move(prev.photos),
    }));
  }

  function updatePhotoAlt(apartmentId: string | null, index: number, alt: string) {
    const update = (photos: Array<{ url: string; alt: string }>) =>
      photos.map((photo, i) => (i === index ? { ...photo, alt } : photo));

    if (apartmentId) {
      setEditForms((prev) => ({
        ...prev,
        [apartmentId]: {
          ...prev[apartmentId],
          photos: update(prev[apartmentId].photos),
        },
      }));
      return;
    }

    setNewForm((prev) => ({
      ...prev,
      photos: update(prev.photos),
    }));
  }

  function ImageUploadArea({ apartmentId }: { apartmentId: string | null }) {
    async function onFilesSelected(files: FileList | null) {
      if (!files || files.length === 0) return;
      const target = apartmentId ?? "__new__";
      setError(null);
      setSuccess(null);
      setUploadingTarget(target);
      setUploadProgress(0);
      try {
        await uploadImages(files, apartmentId ?? undefined);
        setSuccess(`${files.length} Bild(er) hochgeladen.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      } finally {
        setUploadingTarget(null);
        setUploadProgress(0);
      }
    }

    const isUploading = uploadingTarget === (apartmentId ?? "__new__");

    return (
      <div
        className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          void onFilesSelected(event.dataTransfer.files);
        }}
      >
        <p className="mb-2">Bilder hier hineinziehen oder auswählen</p>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={isUploading}
          onChange={(event) => {
            void onFilesSelected(event.target.files);
            event.currentTarget.value = "";
          }}
          className="text-xs"
        />
        {isUploading && (
          <div className="mt-3">
            <div className="h-2 w-full rounded bg-stone-200 overflow-hidden">
              <div
                className="h-full bg-stone-700 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-stone-500">Upload läuft: {uploadProgress}%</p>
          </div>
        )}
      </div>
    );
  }

  function updateEditForm(id: string, patch: Partial<ApartmentForm>) {
    setEditForms((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  async function createApartment(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/apartments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newForm.title,
          shortDescription: newForm.shortDescription,
          description: newForm.description,
          basePriceCents: Number(newForm.basePriceCents),
          sortOrder: Number(newForm.sortOrder),
          isActive: newForm.isActive,
          photos: newForm.photos.map((photo) => ({
            url: photo.url,
            alt: photo.alt || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Anlegen fehlgeschlagen.");

      const created = data.apartment as Apartment;
      setApartments((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setEditForms((prev) => ({
        ...prev,
        [created.id]: toForm(created),
      }));
      setNewForm({
        title: "",
        shortDescription: "",
        description: "",
        basePriceCents: "9500",
        sortOrder: String(apartments.length + 2),
        isActive: true,
        photos: [],
      });
      setSuccess("Apartment wurde angelegt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setCreating(false);
    }
  }

  async function saveApartment(id: string) {
    const form = editForms[id];
    if (!form) return;

    setLoadingId(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/apartments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          shortDescription: form.shortDescription,
          description: form.description,
          basePriceCents: Number(form.basePriceCents),
          sortOrder: Number(form.sortOrder),
          isActive: form.isActive,
          photos: form.photos.map((photo) => ({
            url: photo.url,
            alt: photo.alt || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen.");

      const updated = data.apartment as Apartment;
      setApartments((prev) => prev.map((apartment) => (apartment.id === id ? updated : apartment)).sort((a, b) => a.sortOrder - b.sortOrder));
      setEditForms((prev) => ({
        ...prev,
        [id]: toForm(updated),
      }));
      setSuccess(`Apartment „${updated.title}“ gespeichert.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteApartment(id: string) {
    if (!window.confirm("Apartment wirklich löschen? Zugehörige Bilder und Preise werden ebenfalls entfernt.")) {
      return;
    }

    setLoadingId(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/apartments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Löschen fehlgeschlagen.");
      }
      setApartments((prev) => prev.filter((apartment) => apartment.id !== id));
      setEditForms((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSuccess("Apartment gelöscht.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createApartment} className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="text-lg font-semibold text-stone-700">Neues Apartment</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            value={newForm.title}
            onChange={(e) => setNewForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Name"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            value={newForm.shortDescription}
            onChange={(e) => setNewForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
            placeholder="Kurztext"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            value={newForm.basePriceCents}
            onChange={(e) => setNewForm((prev) => ({ ...prev, basePriceCents: e.target.value }))}
            placeholder="Grundpreis in Cent"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            value={newForm.sortOrder}
            onChange={(e) => setNewForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
            placeholder="Sortierung"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={newForm.description}
          onChange={(e) => setNewForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Details"
          className="w-full min-h-28 border border-stone-300 rounded-lg px-3 py-2 text-sm"
          required
        />
        <ImageUploadArea apartmentId={null} />
        {newForm.photos.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {newForm.photos.map((photo, index) => (
              <div key={`${photo.url}-${index}`} className="rounded-xl border border-stone-200 p-2 space-y-2 bg-white">
                <div className="relative h-36 rounded-lg overflow-hidden bg-stone-100">
                  <Image src={toSmallVariant(photo.url)} alt={photo.alt || `Bild ${index + 1}`} fill className="object-cover" sizes="240px" />
                </div>
                <input
                  value={photo.alt}
                  onChange={(e) => updatePhotoAlt(null, index, e.target.value)}
                  placeholder="Alternativtext (optional)"
                  className="w-full border border-stone-300 rounded-lg px-2 py-1 text-xs"
                />
                <div className="flex items-center gap-2 text-xs">
                  <button type="button" onClick={() => movePhoto(null, index, -1)} className="px-2 py-1 rounded border border-stone-300">↑</button>
                  <button type="button" onClick={() => movePhoto(null, index, 1)} className="px-2 py-1 rounded border border-stone-300">↓</button>
                  <button type="button" onClick={() => removePhoto(null, index)} className="ml-auto text-red-600 hover:underline">Entfernen</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <label className="inline-flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={newForm.isActive}
            onChange={(e) => setNewForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          Aktiv anzeigen
        </label>
        <div>
          <button
            type="submit"
            disabled={creating}
            className="bg-stone-800 hover:bg-stone-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60"
          >
            {creating ? "Speichere…" : "Apartment anlegen"}
          </button>
        </div>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">{success}</div>}

      <div className="space-y-4">
        {apartments.map((apartment) => {
          const form = editForms[apartment.id];
          if (!form) return null;

          return (
            <div key={apartment.id} className="bg-white rounded-2xl shadow p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-stone-700">{apartment.title}</h3>
                <span className="text-xs text-stone-400">Slug: {apartment.slug}</span>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <input
                  value={form.title}
                  onChange={(e) => updateEditForm(apartment.id, { title: e.target.value })}
                  placeholder="Name"
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={form.shortDescription}
                  onChange={(e) => updateEditForm(apartment.id, { shortDescription: e.target.value })}
                  placeholder="Kurztext"
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={form.basePriceCents}
                  onChange={(e) => updateEditForm(apartment.id, { basePriceCents: e.target.value })}
                  placeholder="Grundpreis in Cent"
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => updateEditForm(apartment.id, { sortOrder: e.target.value })}
                  placeholder="Sortierung"
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <textarea
                value={form.description}
                onChange={(e) => updateEditForm(apartment.id, { description: e.target.value })}
                placeholder="Details"
                className="w-full min-h-28 border border-stone-300 rounded-lg px-3 py-2 text-sm"
              />

              <ImageUploadArea apartmentId={apartment.id} />
              {form.photos.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {form.photos.map((photo, index) => (
                    <div key={`${photo.url}-${index}`} className="rounded-xl border border-stone-200 p-2 space-y-2 bg-white">
                      <div className="relative h-36 rounded-lg overflow-hidden bg-stone-100">
                        <Image src={toSmallVariant(photo.url)} alt={photo.alt || `Bild ${index + 1}`} fill className="object-cover" sizes="240px" />
                      </div>
                      <input
                        value={photo.alt}
                        onChange={(e) => updatePhotoAlt(apartment.id, index, e.target.value)}
                        placeholder="Alternativtext (optional)"
                        className="w-full border border-stone-300 rounded-lg px-2 py-1 text-xs"
                      />
                      <div className="flex items-center gap-2 text-xs">
                        <button type="button" onClick={() => movePhoto(apartment.id, index, -1)} className="px-2 py-1 rounded border border-stone-300">↑</button>
                        <button type="button" onClick={() => movePhoto(apartment.id, index, 1)} className="px-2 py-1 rounded border border-stone-300">↓</button>
                        <button type="button" onClick={() => removePhoto(apartment.id, index)} className="ml-auto text-red-600 hover:underline">Entfernen</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label className="inline-flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateEditForm(apartment.id, { isActive: e.target.checked })}
                />
                Aktiv anzeigen
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => saveApartment(apartment.id)}
                  disabled={loadingId === apartment.id}
                  className="bg-stone-800 hover:bg-stone-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60"
                >
                  {loadingId === apartment.id ? "Speichere…" : "Speichern"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteApartment(apartment.id)}
                  disabled={loadingId === apartment.id}
                  className="text-red-600 hover:underline text-sm disabled:opacity-60"
                >
                  Löschen
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
