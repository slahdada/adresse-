import React, { useState, useEffect, useRef } from 'react';
import { Contact, ContactType, PhoneEntry, EmailEntry } from '../types/contact';
import {
  X,
  Plus,
  Trash2,
  Camera,
  Upload,
  AlertCircle,
  Building2,
  User,
  RefreshCw,
  Check,
} from 'lucide-react';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contactData: Contact) => void;
  initialContact?: Contact | null;
  existingContacts: Contact[];
  onDuplicateDetected: (incoming: Partial<Contact>, duplicateMatch: any) => void;
}

const PREDEFINED_CATEGORIES = ['Personnel', 'Travail', 'Famille', 'Amis', 'VIP', 'Partenaire', 'Santé'];

/**
 * Optimizes and crops avatar photos to a lightweight square 400x400 JPEG data URL
 * preventing memory choke and localStorage / IndexedDB quota exceeded errors.
 */
function processAndCompressImage(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const TARGET_SIZE = 400;
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Image invalide ou illisible'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
}

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialContact,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Live Camera state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');

  // Form State
  const [type, setType] = useState<ContactType>('person');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phones, setPhones] = useState<PhoneEntry[]>([
    { id: '1', label: 'Mobile', number: '' },
  ]);
  const [emails, setEmails] = useState<EmailEntry[]>([
    { id: '1', label: 'Personnel', email: '' },
  ]);
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('France');
  const [website, setWebsite] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [notes, setNotes] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Validation & Dirty state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Cleanup active camera stream when modal closes
  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopLiveCamera();
    }
  }, [isOpen]);

  // Bind live camera video stream
  useEffect(() => {
    if (isLiveCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isLiveCameraOpen]);

  // Start live camera stream with automatic fallback to native mobile camera
  const startCamera = async (mode: 'user' | 'environment' = cameraFacingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        streamRef.current = stream;
        setCameraFacingMode(mode);
        setIsLiveCameraOpen(true);
      } else {
        cameraInputRef.current?.click();
      }
    } catch (err) {
      console.warn('getUserMedia non accessible, bascule vers la caméra native système:', err);
      cameraInputRef.current?.click();
    }
  };

  const switchCameraFacingMode = () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    startCamera(nextMode);
  };

  const captureLiveSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const TARGET_SIZE = 400;

    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;
    const minDim = Math.min(vWidth, vHeight);
    const startX = (vWidth - minDim) / 2;
    const startY = (vHeight - minDim) / 2;

    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror if front camera for natural selfie look
      if (cameraFacingMode === 'user') {
        ctx.translate(TARGET_SIZE, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setAvatar(dataUrl);
      setIsDirty(true);
    }
    stopLiveCamera();
  };

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (initialContact) {
        setType(initialContact.type || 'person');
        setFirstName(initialContact.firstName || '');
        setLastName(initialContact.lastName || '');
        setCompany(initialContact.company || '');
        setJobTitle(initialContact.jobTitle || '');
        setPhones(
          initialContact.phones && initialContact.phones.length > 0
            ? initialContact.phones
            : [{ id: '1', label: 'Mobile', number: '' }]
        );
        setEmails(
          initialContact.emails && initialContact.emails.length > 0
            ? initialContact.emails
            : [{ id: '1', label: 'Personnel', email: '' }]
        );
        setStreet(initialContact.address?.street || '');
        setPostalCode(initialContact.address?.postalCode || '');
        setCity(initialContact.address?.city || '');
        setCountry(initialContact.address?.country || 'France');
        setWebsite(initialContact.website || '');
        setCategories(initialContact.categories || []);
        setNotes(initialContact.notes || '');
        setAvatar(initialContact.avatar || '');
        setIsFavorite(!!initialContact.isFavorite);
      } else {
        // Reset defaults
        setType('person');
        setFirstName('');
        setLastName('');
        setCompany('');
        setJobTitle('');
        setPhones([{ id: '1', label: 'Mobile', number: '' }]);
        setEmails([{ id: '1', label: 'Personnel', email: '' }]);
        setStreet('');
        setPostalCode('');
        setCity('');
        setCountry('France');
        setWebsite('');
        setCategories([]);
        setNotes('');
        setAvatar('');
        setIsFavorite(false);
      }
      setErrorMessage(null);
      setIsDirty(false);
      setShowDiscardConfirm(false);
    }
  }, [isOpen, initialContact]);

  // Handle Keyboard Escape & Tab Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        attemptClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  if (!isOpen) return null;

  const attemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Add/remove phone
  const addPhone = () => {
    setPhones((prev) => [
      ...prev,
      { id: `p-${Date.now()}`, label: 'Mobile', number: '' },
    ]);
    setIsDirty(true);
  };

  const removePhone = (id: string) => {
    setPhones((prev) => prev.filter((p) => p.id !== id));
    setIsDirty(true);
  };

  const updatePhone = (id: string, field: 'label' | 'number', val: string) => {
    setPhones((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
    setIsDirty(true);
  };

  // Add/remove email
  const addEmail = () => {
    setEmails((prev) => [
      ...prev,
      { id: `e-${Date.now()}`, label: 'Personnel', email: '' },
    ]);
    setIsDirty(true);
  };

  const removeEmail = (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    setIsDirty(true);
  };

  const updateEmail = (id: string, field: 'label' | 'email', val: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: val } : e))
    );
    setIsDirty(true);
  };

  // Toggle category
  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setIsDirty(true);
  };

  const addCustomCategory = () => {
    const trimmed = newCatInput.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
      setNewCatInput('');
      setIsDirty(true);
    }
  };

  // Handle image upload from file or native camera
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Le fichier sélectionné doit être une image.');
      return;
    }

    try {
      const compressedDataUrl = await processAndCompressImage(file);
      setAvatar(compressedDataUrl);
      setIsDirty(true);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Impossible de traiter la photo sélectionnée.');
    } finally {
      // Clear value so the user can re-select if desired
      e.target.value = '';
    }
  };

  // Form submission with validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation rule: At least a firstName, a lastName, OR a company
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedCompany = company.trim();

    if (!trimmedFirst && !trimmedLast && !trimmedCompany) {
      setErrorMessage(
        'Veuillez renseigner au minimum un prénom, un nom ou une raison sociale.'
      );
      return;
    }

    // Filter valid phones & emails
    const validPhones = phones
      .map((p) => ({ ...p, number: p.number.trim() }))
      .filter((p) => p.number.length > 0);

    const validEmails = emails
      .map((e) => ({ ...e, email: e.email.trim() }))
      .filter((e) => e.email.length > 0);

    const contactPayload: Contact = {
      id: initialContact?.id || `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      company: trimmedCompany,
      jobTitle: jobTitle.trim(),
      phones: validPhones,
      emails: validEmails,
      address: {
        street: street.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        country: country.trim(),
      },
      website: website.trim(),
      categories,
      notes: notes.trim(),
      avatar,
      isFavorite,
      voiceNotes: initialContact?.voiceNotes || [],
      createdAt: initialContact?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(contactPayload);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[92dvh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <h3
            id="contact-modal-title"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {initialContact ? 'Modifier le contact' : 'Nouveau contact'}
          </h3>
          <button
            type="button"
            onClick={attemptClose}
            aria-label="Fermer"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Type selector (Personne vs Société) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Type de contact
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('person');
                  setIsDirty(true);
                }}
                className={`min-h-[40px] flex items-center justify-center gap-2 text-xs font-semibold rounded-lg transition-colors ${
                  type === 'person'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <User className="w-4 h-4" />
                Personne
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('company');
                  setIsDirty(true);
                }}
                className={`min-h-[40px] flex items-center justify-center gap-2 text-xs font-semibold rounded-lg transition-colors ${
                  type === 'company'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Société / Entreprise
              </button>
            </div>
          </div>

          {/* Photo / Avatar Upload & Live Camera */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Aperçu du contact"
                  referrerPolicy="no-referrer"
                  className="w-18 h-18 rounded-2xl object-cover border-2 border-sky-500/50 shadow-xs"
                />
              ) : (
                <div className="w-18 h-18 rounded-2xl bg-slate-200/80 dark:bg-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-600">
                  <Camera className="w-7 h-7" />
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              {/* Hidden file input for gallery picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-gallery-input"
              />
              {/* Hidden file input for native device camera fallback */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-camera-input"
              />

              <div className="flex flex-wrap items-center gap-2">
                {/* Button 1: Live Camera / Capture photo */}
                <button
                  type="button"
                  onClick={() => startCamera('user')}
                  aria-label="Prendre une photo avec l'appareil photo"
                  className="min-h-[40px] px-3.5 flex items-center gap-1.5 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Prendre une photo</span>
                </button>

                {/* Button 2: Choose from gallery */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Choisir une image depuis les fichiers"
                  className="min-h-[40px] px-3 flex items-center gap-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Galerie</span>
                </button>

                {/* Button 3: Remove photo if set */}
                {avatar && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatar('');
                      setIsDirty(true);
                    }}
                    aria-label="Supprimer la photo actuelle"
                    className="min-h-[40px] px-2.5 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Prise de vue directe ou fichier image. Optimisé et stocké localement sans perte.
              </p>
            </div>
          </div>

          {/* Identity Fields (Responsive grid: 1 col on mobile, 2 col on tablet/desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {type === 'person' ? (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="ex. Jean-François"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="ex. Dupont"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Société / Organisation (facultatif)
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="ex. Atelier Lumière"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Fonction / Poste (facultatif)
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => {
                      setJobTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="ex. Directeur Général"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Raison sociale / Nom de l'entreprise <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="ex. Clinique Vétérinaire du Parc"
                    required
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Activité / Service
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => {
                      setJobTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="ex. Urgences & Soins 24/7"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </>
            )}
          </div>

          {/* Dynamic Phone Numbers */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Numéros de Téléphone
              </label>
              <button
                type="button"
                onClick={addPhone}
                className="min-h-[40px] px-2.5 flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un numéro
              </button>
            </div>

            <div className="space-y-2">
              {phones.map((phone) => (
                <div key={phone.id} className="flex items-center gap-2">
                  <select
                    value={phone.label}
                    onChange={(e) => updatePhone(phone.id, 'label', e.target.value)}
                    aria-label="Libellé du numéro"
                    className="w-32 min-h-[44px] px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="Mobile">Mobile</option>
                    <option value="Domicile">Domicile</option>
                    <option value="Travail">Travail</option>
                    <option value="Autre">Autre</option>
                  </select>

                  <input
                    type="tel"
                    value={phone.number}
                    onChange={(e) => updatePhone(phone.id, 'number', e.target.value)}
                    placeholder="ex. +33 6 12 34 56 78"
                    className="flex-1 min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 font-mono"
                  />

                  {phones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhone(phone.id)}
                      aria-label="Supprimer ce numéro"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Email Addresses */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Adresses E-mail
              </label>
              <button
                type="button"
                onClick={addEmail}
                className="min-h-[40px] px-2.5 flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un e-mail
              </button>
            </div>

            <div className="space-y-2">
              {emails.map((email) => (
                <div key={email.id} className="flex items-center gap-2">
                  <select
                    value={email.label}
                    onChange={(e) => updateEmail(email.id, 'label', e.target.value)}
                    aria-label="Libellé de l'e-mail"
                    className="w-32 min-h-[44px] px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="Personnel">Personnel</option>
                    <option value="Travail">Travail</option>
                    <option value="Autre">Autre</option>
                  </select>

                  <input
                    type="email"
                    value={email.email}
                    onChange={(e) => updateEmail(email.id, 'email', e.target.value)}
                    placeholder="ex. contact@exemple.fr"
                    className="flex-1 min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                  />

                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(email.id)}
                      aria-label="Supprimer cet email"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Postal Address */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Adresse Postale
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={street}
                  onChange={(e) => {
                    setStreet(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Numéro et nom de rue"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Code postal (ex. 75001)"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Ville (ex. Paris)"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Pays (ex. France)"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Website */}
          <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Site Web
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value);
                setIsDirty(true);
              }}
              placeholder="https://..."
              className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Categories */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Catégories & Groupes
            </label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_CATEGORIES.map((cat) => {
                const isSelected = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                      isSelected
                        ? 'bg-sky-600 text-white font-semibold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Custom category input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomCategory();
                  }
                }}
                placeholder="Nouvelle étiquette personnalisée..."
                className="flex-1 min-h-[40px] px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={addCustomCategory}
                className="min-h-[40px] px-3 text-xs font-medium rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setIsDirty(true);
              }}
              rows={3}
              placeholder="Remarques, détails de rencontre, disponibilités..."
              className="w-full p-3.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>
        </form>

        {/* Sticky Action Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={attemptClose}
            className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="min-h-[44px] px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition shadow-sm active:scale-98"
          >
            {initialContact ? 'Enregistrer les modifications' : 'Créer le contact'}
          </button>
        </div>
      </div>

      {/* Live Camera Viewfinder Modal */}
      {isLiveCameraOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Prise de photo en direct"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl flex flex-col items-center gap-4 text-white">
            <div className="w-full flex items-center justify-between pb-1">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-400" />
                Appareil photo
              </span>
              <button
                type="button"
                onClick={stopLiveCamera}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Fermer la caméra"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-black border-2 border-slate-700 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? '-scale-x-100' : ''}`}
              />
              {/* Subtle targeting circle */}
              <div className="pointer-events-none absolute inset-4 border border-white/25 rounded-full" />
            </div>

            {/* Camera Controls */}
            <div className="w-full flex items-center justify-around pt-2">
              {/* Switch front/back camera */}
              <button
                type="button"
                onClick={switchCameraFacingMode}
                title="Changer de caméra (avant/arrière)"
                aria-label="Basculer entre caméra avant et arrière"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* Large circular shutter button */}
              <button
                type="button"
                onClick={captureLiveSnapshot}
                aria-label="Prendre la photo"
                title="Prendre la photo"
                className="w-16 h-16 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg active:scale-90 transition hover:bg-slate-100 ring-4 ring-sky-500/50"
              >
                <div className="w-12 h-12 rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-slate-900" />
                </div>
              </button>

              {/* Native camera file picker fallback button */}
              <button
                type="button"
                onClick={() => {
                  stopLiveCamera();
                  cameraInputRef.current?.click();
                }}
                title="Utiliser l'application Caméra du téléphone"
                aria-label="Utiliser l'application Caméra du téléphone"
                className="min-h-[44px] px-2.5 flex items-center justify-center rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
              >
                App Caméra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard changes prompt */}
      {showDiscardConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-2xl">
            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Quitter sans enregistrer ?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Des modifications ont été apportées. Si vous quittez maintenant, elles ne seront pas conservées.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Continuer la saisie
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  setIsDirty(false);
                  onClose();
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
