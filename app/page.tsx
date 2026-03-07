'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Package,
  FolderTree,
  ShoppingCart,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  EyeOff,
  ImagePlus,
  LayoutGrid,
  List,
  LogOut,
  User,
  Shield,
  Tag,
  Rocket,
  GitBranch,
  ExternalLink,
  Clock,
  RefreshCw,
  Palette,
  Type,
  Sparkles
} from 'lucide-react';

// Types
interface Category {
  id: string;
  name: string;
  order: number;
  image: string;
}

interface SubCategory {
  id: string;
  name: string;
  order: number;
  image: string;
}

interface MoreDetails {
  "Key Features"?: string;
  "Storage Tips"?: string;
  "Type"?: string;
  "Shelf Life"?: string;
  "Manufacturer Details"?: string;
  "Marketed By"?: string;
  "Return Policy"?: string;
  [key: string]: string | undefined;
}

interface Product {
  _id: string;
  name: string;
  image: string[];
  unit: string;
  stock: number;
  price: number;
  discount?: number;
  description: string;
  more_details: MoreDetails;
  publish: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface CategoriesData {
  total: number;
  categories: Category[];
}

interface SubCategoriesData {
  parent: {
    id: string;
    name: string;
  };
  total: number;
  subcategories: SubCategory[];
}

interface ProductsData {
  parent: {
    category_id: string;
    category_name: string;
    subcategory_id: string;
    subcategory_name: string;
  };
  total: number;
  products: Product[];
}

type ViewMode = 'dashboard' | 'categories' | 'subcategories' | 'products';
type FormMode = 'add-category' | 'add-subcategory' | 'add-product' | null;

// Helper function to display price in Rupees
const DisplayPriceInRupees = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

// Helper function to calculate discounted price
const priceWithDiscount = (price: number, discount?: number): number => {
  if (!discount) return price;
  return Math.round(price - (price * discount / 100));
};

export default function AdminPanel() {
  // Authentication
  const { data: session, status } = useSession();
  const router = useRouter();

  // State Management
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Preview Mode State
  const [previewMode, setPreviewMode] = useState(false);

  // Inline Editing States
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Add Form States
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [addFormData, setAddFormData] = useState<any>({});
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);

  // Product Multiple Images State
  const [productImages, setProductImages] = useState<{ file: File; preview: string }[]>([]);
  const [editProductImages, setEditProductImages] = useState<{ file?: File; preview: string; isExisting: boolean }[]>([]);

  // Publish/Release State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [latestRelease, setLatestRelease] = useState<{ tag: string; name?: string; publishedAt?: string } | null>(null);
  const [newVersion, setNewVersion] = useState('');
  const [publishedVersion, setPublishedVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');

  // Publish Steps State for live updates
  interface PublishStep {
    id: string;
    label: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    message?: string;
    details?: string;
  }
  const [publishSteps, setPublishSteps] = useState<PublishStep[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<{
    hasWorkflows: boolean;
    status?: string;
    conclusion?: string;
    url?: string;
  } | null>(null);

  // More Details expanded state
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Composite Image Generation State (Blinkit-style)
  const [compositeLabel, setCompositeLabel] = useState('');
  const [compositeBgColor, setCompositeBgColor] = useState('#FFF5E6');
  const [compositeTextColor, setCompositeTextColor] = useState('#1a1a1a');
  const [compositePreview, setCompositePreview] = useState<string | null>(null);
  const [compositeFile, setCompositeFile] = useState<File | null>(null);
  const [rawPhotoPreview, setRawPhotoPreview] = useState<string | null>(null);
  const [rawPhotoFile, setRawPhotoFile] = useState<File | null>(null);
  // Edit mode composite state
  const [editCompositeLabel, setEditCompositeLabel] = useState('');
  const [editCompositeBgColor, setEditCompositeBgColor] = useState('#FFF5E6');
  const [editCompositeTextColor, setEditCompositeTextColor] = useState('#1a1a1a');
  const [editCompositePreview, setEditCompositePreview] = useState<string | null>(null);
  const [editRawPhotoPreview, setEditRawPhotoPreview] = useState<string | null>(null);
  const [editRawPhotoFile, setEditRawPhotoFile] = useState<File | null>(null);

  // Preset background colors for category cards
  const bgColorPresets = [
    { color: '#FFF5E6', name: 'Warm Cream' },
    { color: '#E8F5E9', name: 'Mint Green' },
    { color: '#FFF3E0', name: 'Light Orange' },
    { color: '#F3E5F5', name: 'Soft Purple' },
    { color: '#E3F2FD', name: 'Light Blue' },
    { color: '#FBE9E7', name: 'Soft Red' },
    { color: '#FFFDE7', name: 'Light Yellow' },
    { color: '#F1F8E9', name: 'Lime Green' },
    { color: '#FCE4EC', name: 'Soft Pink' },
    { color: '#E0F2F1', name: 'Teal' },
  ];

  const BASE_IMAGE_URL = 'https://cdn.jsdelivr.net/gh/iFrugal/json-data-keeper@main/kb-v2';

  // Generate composite image with Canvas (Blinkit-style: photo + label baked in)
  const generateCompositeImage = async (
    photoDataUrl: string,
    label: string,
    bgColor: string,
    textColor: string
  ): Promise<{ dataUrl: string; file: File }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      // 400x400 for high-res, works well for grid-cols-3 to grid-cols-10
      const SIZE = 400;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // 1. Fill card background white, clip to rounded rect
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(0, 0, SIZE, SIZE, 24);
        } else {
          // Polyfill for older browsers
          const r = 24;
          ctx.moveTo(r, 0);
          ctx.lineTo(SIZE - r, 0);
          ctx.quadraticCurveTo(SIZE, 0, SIZE, r);
          ctx.lineTo(SIZE, SIZE - r);
          ctx.quadraticCurveTo(SIZE, SIZE, SIZE - r, SIZE);
          ctx.lineTo(r, SIZE);
          ctx.quadraticCurveTo(0, SIZE, 0, SIZE - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
        }
        ctx.fill();
        ctx.clip();

        // 2. Draw photo container box (bgColor) with padding inside the card
        const containerMargin = SIZE * 0.04;
        const photoAreaHeight = SIZE * 0.65;
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(containerMargin, containerMargin, SIZE - containerMargin * 2, photoAreaHeight - containerMargin, 16);
        } else {
          ctx.rect(containerMargin, containerMargin, SIZE - containerMargin * 2, photoAreaHeight - containerMargin);
        }
        ctx.fill();

        // 3. Draw the product photo inside the container
        const photoTopPadding = SIZE * 0.06;
        const photoSidePadding = SIZE * 0.10;
        const availableWidth = SIZE - photoSidePadding * 2;
        const availableHeight = photoAreaHeight - containerMargin - photoTopPadding;

        // Maintain aspect ratio
        const scale = Math.min(availableWidth / img.width, availableHeight / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const drawX = (SIZE - drawWidth) / 2;
        const drawY = containerMargin + photoTopPadding + (availableHeight - drawHeight) / 2;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // 4. Draw label text on the white area below the photo container
        const textAreaY = photoAreaHeight + SIZE * 0.01;
        const textAreaHeight = SIZE - textAreaY;
        const maxTextWidth = SIZE - 32;

        // Auto-size font: start at 36px, shrink to fit
        let fontSize = 36;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

        // Word wrap and font sizing
        const wrapText = (text: string, maxWidth: number, fSize: number): string[] => {
          ctx.font = `bold ${fSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          const words = text.split(' ');
          const lines: string[] = [];
          let currentLine = words[0] || '';
          for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            if (ctx.measureText(testLine).width > maxWidth) {
              lines.push(currentLine);
              currentLine = words[i];
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine);
          return lines;
        };

        // Find best font size (max 2 lines)
        let lines: string[] = [];
        while (fontSize > 18) {
          lines = wrapText(label, maxTextWidth, fontSize);
          const lineHeight = fontSize * 1.2;
          if (lines.length <= 2 && lines.length * lineHeight <= textAreaHeight - 16) break;
          fontSize -= 2;
        }

        // Draw text centered in bottom area
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lineHeight = fontSize * 1.25;
        const totalTextHeight = lines.length * lineHeight;
        const textStartY = textAreaY + (textAreaHeight - totalTextHeight) / 2 + lineHeight / 2;

        lines.forEach((line, i) => {
          ctx.fillText(line, SIZE / 2, textStartY + i * lineHeight);
        });

        // Convert to PNG
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Failed to generate image')); return; }
          const dataUrl = canvas.toDataURL('image/png');
          const file = new File([blob], 'composite.png', { type: 'image/png' });
          resolve({ dataUrl, file });
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Failed to load photo'));
      img.src = photoDataUrl;
    });
  };

  // Handle raw photo upload for composite generation
  const handleRawPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', 'Photo size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (isEdit) {
          setEditRawPhotoFile(file);
          setEditRawPhotoPreview(dataUrl);
        } else {
          setRawPhotoFile(file);
          setRawPhotoPreview(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate and preview composite image
  const generateAndPreviewComposite = async (isEdit = false) => {
    const photoPreview = isEdit ? editRawPhotoPreview : rawPhotoPreview;
    const label = isEdit ? editCompositeLabel : compositeLabel;
    const bgColor = isEdit ? editCompositeBgColor : compositeBgColor;
    const textColor = isEdit ? editCompositeTextColor : compositeTextColor;

    if (!photoPreview || !label.trim()) {
      showMessage('error', 'Please upload a photo and enter a label');
      return;
    }

    try {
      const { dataUrl, file } = await generateCompositeImage(photoPreview, label.trim(), bgColor, textColor);
      if (isEdit) {
        setEditCompositePreview(dataUrl);
        setNewImageFile(file);
        setImagePreview(dataUrl);
      } else {
        setCompositePreview(dataUrl);
        setCompositeFile(file);
        setAddImageFile(file);
        setAddImagePreview(dataUrl);
      }
      showMessage('success', 'Composite image generated!');
    } catch (error) {
      showMessage('error', 'Failed to generate composite image');
    }
  };

  // Default more_details template
  const defaultMoreDetails: MoreDetails = {
    "Key Features": "",
    "Storage Tips": "",
    "Type": "",
    "Shelf Life": "",
    "Manufacturer Details": "",
    "Marketed By": "",
    "Return Policy": ""
  };

  // Fetch Categories (only categories, no subcategories or products)
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/github?action=get-file&path=master/category/all.json');
      const data = await response.json();
      if (data.content) {
        setCategories(data.content.categories || []);
      }
    } catch (error) {
      showMessage('error', 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  // Fetch SubCategories
  const fetchSubCategories = async (categoryId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/github?action=get-file&path=master/category/${categoryId}/sub-categories.json`);
      const data = await response.json();
      if (data.content) {
        setSubcategories(data.content.subcategories || []);
      }
    } catch (error) {
      showMessage('error', 'Failed to fetch subcategories');
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Products
  const fetchProducts = async (categoryId: string, subCategoryId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/github?action=get-file&path=master/category/${categoryId}/sub-category/${subCategoryId}/products.json`);
      const data = await response.json();
      if (data.content) {
        setProducts(data.content.products || []);
      }
    } catch (error) {
      showMessage('error', 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch latest release/tag
  const fetchLatestRelease = async () => {
    try {
      const response = await fetch('/api/github?action=get-latest-release');
      const data = await response.json();
      if (data.tag) {
        setLatestRelease({
          tag: data.tag,
          name: data.name,
          publishedAt: data.publishedAt
        });
        // Suggest next version based on current format
        const currentTag = data.tag;

        // Check if it's date-based format (e.g., 2025-01-27_B1)
        const dateMatch = currentTag.match(/^(\d{4}-\d{2}-\d{2})_B(\d+)$/);
        if (dateMatch) {
          const today = new Date().toISOString().split('T')[0];
          if (dateMatch[1] === today) {
            // Same day, increment build number
            const nextBuild = parseInt(dateMatch[2]) + 1;
            setNewVersion(`${today}_B${nextBuild}`);
          } else {
            // New day, start at B1
            setNewVersion(`${today}_B1`);
          }
        }
        // Check if it's semantic versioning (e.g., v1.0.0)
        else if (/^v\d+\.\d+\.\d+$/.test(currentTag)) {
          const parts = currentTag.replace('v', '').split('.').map(Number);
          parts[2] = (parts[2] || 0) + 1;
          setNewVersion(`v${parts.join('.')}`);
        }
        // Default: suggest date-based
        else {
          const today = new Date().toISOString().split('T')[0];
          setNewVersion(`${today}_B1`);
        }
      } else {
        setLatestRelease(null);
        // Default to date-based format for first release
        const today = new Date().toISOString().split('T')[0];
        setNewVersion(`${today}_B1`);
      }
    } catch (error) {
      console.error('Failed to fetch latest release:', error);
      const today = new Date().toISOString().split('T')[0];
      setNewVersion(`${today}_B1`);
    }
  };

  // Update a publish step
  const updatePublishStep = (stepId: string, updates: Partial<PublishStep>) => {
    setPublishSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  // Check deployment status — returns data so callers don't rely on stale state
  const checkDeploymentStatus = async () => {
    const response = await fetch('/api/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-b2c-deployment-status' }),
    });
    if (!response.ok) throw new Error(`Deployment status check failed (HTTP ${response.status})`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to check deployment status');
    const status = {
      hasWorkflows: data.hasDeployment,
      status: data.deployment?.state,
      conclusion: data.deployment?.state === 'READY' ? 'success' : data.deployment?.state === 'ERROR' ? 'failure' : undefined,
      url: data.deployment?.prodUrl || data.deployment?.url,
    };
    setDeploymentStatus(status);
    return status;
  };

  // Publish new release with step-by-step progress
  const publishRelease = async () => {
    // Validate tag format - allow multiple formats
    const validTagPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (!newVersion || !validTagPattern.test(newVersion)) {
      showMessage('error', 'Invalid version format. Use formats like: 2025-01-27_B1, v1.0.0, or release-1');
      return;
    }

    // Initialize steps
    const steps: PublishStep[] = [
      { id: 'create-tag', label: 'Creating Git tag in json-data-keeper', status: 'pending' },
      { id: 'create-release', label: 'Creating GitHub Release', status: 'pending' },
      { id: 'update-b2c-env', label: 'Updating Vercel env & triggering deployment', status: 'pending' },
      { id: 'track-deployment', label: 'Tracking Vercel deployment', status: 'pending' },
      { id: 'verify-version', label: 'Verifying live site version', status: 'pending' },
    ];

    setPublishSteps(steps);
    setIsPublishing(true);
    setPublishLoading(true);
    setDeploymentStatus(null);

    try {
      // Step 1: Create tag and release
      updatePublishStep('create-tag', { status: 'in_progress', message: 'Creating tag...' });

      const releaseResponse = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-release',
          tagName: newVersion,
          releaseName: `Release ${newVersion}`,
          releaseNotes: releaseNotes || `Published from Admin Panel by ${session?.user?.email}`,
          publishedBy: session?.user?.email || 'Admin',
        }),
      });

      const releaseData = await releaseResponse.json();

      if (!releaseResponse.ok || !releaseData.success) {
        const msg = releaseData.error || `HTTP ${releaseResponse.status}: Failed to create tag`;
        updatePublishStep('create-tag', { status: 'failed', message: msg });
        throw new Error(msg);
      }

      updatePublishStep('create-tag', {
        status: 'completed',
        message: `Tag ${newVersion} created`,
        details: releaseData.cdnUrl
      });

      updatePublishStep('create-release', {
        status: 'completed',
        message: 'GitHub Release created',
        details: releaseData.releaseUrl
      });

      // Step 2: Update NEXT_PUBLIC_DATA_VERSION in Vercel + trigger deployment
      updatePublishStep('update-b2c-env', { status: 'in_progress', message: 'Updating Vercel environment...' });

      const envResponse = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-b2c-env',
          tagName: newVersion,
        }),
      });

      const envData = await envResponse.json();

      if (!envResponse.ok || !envData.success) {
        const msg = envData.error || `HTTP ${envResponse.status}: Failed to update Vercel env`;
        updatePublishStep('update-b2c-env', { status: 'failed', message: msg });
        throw new Error(msg);
      }

      updatePublishStep('update-b2c-env', {
        status: 'completed',
        message: `NEXT_PUBLIC_DATA_VERSION=${newVersion}`,
        details: envData.deploymentUrl || 'Deployment triggered',
      });

      // Step 3: Poll Vercel deployment by ID until READY or ERROR (max ~3.5 min)
      updatePublishStep('track-deployment', { status: 'in_progress', message: 'Deployment triggered, waiting for build...' });

      const deploymentId = envData.deploymentId;
      let inspectorUrl = envData.inspectorUrl || null;
      const DEPLOY_MAX_ATTEMPTS = 21; // 21 * 10s = 3.5 min
      let deploymentReady = false;

      for (let attempt = 1; attempt <= DEPLOY_MAX_ATTEMPTS; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 10000));

        const pollRes = await fetch('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-workflow-run', runId: deploymentId }),
        });

        if (!pollRes.ok) {
          const pollErr = await pollRes.json();
          const msg = pollErr.error || `HTTP ${pollRes.status}: Failed to poll deployment`;
          updatePublishStep('track-deployment', { status: 'failed', message: msg, details: inspectorUrl });
          throw new Error(msg);
        }

        const pollData = await pollRes.json();
        const state = pollData.deployment?.state;
        inspectorUrl = pollData.deployment?.inspectorUrl || inspectorUrl;

        if (state === 'READY') {
          updatePublishStep('track-deployment', {
            status: 'completed',
            message: `Deployment live! (${attempt * 10}s)`,
            details: inspectorUrl,
          });
          deploymentReady = true;
          break;
        }

        if (state === 'ERROR' || state === 'CANCELED') {
          updatePublishStep('track-deployment', {
            status: 'failed',
            message: `Deployment ${state.toLowerCase()}`,
            details: inspectorUrl,
          });
          throw new Error(`Vercel deployment ${state.toLowerCase()}`);
        }

        updatePublishStep('track-deployment', {
          status: 'in_progress',
          message: `${state?.toLowerCase() || 'building'}... (${attempt * 10}s elapsed)`,
          details: inspectorUrl,
        });
      }

      if (!deploymentReady) {
        updatePublishStep('track-deployment', {
          status: 'failed',
          message: 'Deployment timed out after 3.5 minutes',
          details: inspectorUrl,
        });
        throw new Error('Deployment timed out');
      }

      // Step 4: Poll live site until version matches (max 2 min)
      const verifyUrl = 'https://kbmarts.com/api/config';
      updatePublishStep('verify-version', { status: 'in_progress', message: `Waiting for v${newVersion} to appear at ${verifyUrl} ...` });

      const MAX_ATTEMPTS = 6;
      const INTERVAL_MS = 20000;
      let verified = false;
      let liveVersion = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
        updatePublishStep('verify-version', { status: 'in_progress', message: `Polling ${verifyUrl} for v${newVersion} ... (attempt ${attempt}/${MAX_ATTEMPTS})` });

        const verifyResponse = await fetch('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify-live-version', expectedVersion: newVersion }),
        });

        if (!verifyResponse.ok) {
          const verifyErr = await verifyResponse.json();
          updatePublishStep('verify-version', { status: 'failed', message: verifyErr.error || `HTTP ${verifyResponse.status}` });
          throw new Error(verifyErr.error || 'Failed to verify live version');
        }

        const verifyData = await verifyResponse.json();
        liveVersion = verifyData.liveVersion;

        if (verifyData.matches) {
          updatePublishStep('verify-version', {
            status: 'completed',
            message: `Confirmed! kbmarts.com is now serving v${liveVersion}`,
            details: verifyUrl,
          });
          verified = true;
          break;
        } else {
          updatePublishStep('verify-version', {
            status: 'in_progress',
            message: `${verifyUrl} returned v${liveVersion || 'unknown'}, waiting for v${newVersion} ... (attempt ${attempt}/${MAX_ATTEMPTS})`,
          });
        }
      }

      if (!verified) {
        updatePublishStep('verify-version', {
          status: 'failed',
          message: `Timed out. ${verifyUrl} still shows v${liveVersion || 'unknown'}, expected v${newVersion}`,
          details: verifyUrl,
        });
      }

      setPublishedVersion(newVersion);
      showMessage('success', `Version ${newVersion} published${verified ? ' and live!' : ' — deployment in progress'}`);
      fetchLatestRelease();

    } catch (error: any) {
      // Mark any still-pending or in-progress steps as failed
      setPublishSteps(prev => prev.map(step =>
        step.status === 'in_progress' || step.status === 'pending'
          ? { ...step, status: 'failed', message: error.message }
          : step
      ));
      showMessage('error', error.message || 'Failed to publish release');
    } finally {
      setPublishLoading(false);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load initial data when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetchCategories();
      fetchLatestRelease();
    }
  }, [status]);

  // Handle sign out
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Show loading screen while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (status === 'unauthenticated' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-red-500" />
          <p className="text-gray-600">Access Denied. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show message helper
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Image upload handler (for inline editing)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showMessage('error', 'Image size should be less than 2MB');
        return;
      }
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Image upload handler (for add forms)
  const handleAddImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showMessage('error', 'Image size should be less than 2MB');
        return;
      }
      setAddImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAddImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Multiple product images upload handler
  const handleProductImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: { file: File; preview: string }[] = [];
      Array.from(files).forEach(file => {
        if (file.size > 2 * 1024 * 1024) {
          showMessage('error', `Image ${file.name} is larger than 2MB`);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push({ file, preview: reader.result as string });
          if (newImages.length === files.length) {
            setProductImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Edit product images upload handler
  const handleEditProductImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.size > 2 * 1024 * 1024) {
          showMessage('error', `Image ${file.name} is larger than 2MB`);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditProductImages(prev => [...prev, { file, preview: reader.result as string, isExisting: false }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Remove product image
  const removeProductImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  // Remove edit product image
  const removeEditProductImage = (index: number) => {
    setEditProductImages(prev => prev.filter((_, i) => i !== index));
  };

  // Upload image to GitHub
  const uploadImageToGitHub = async (file: File, path: string): Promise<string> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        const base64Content = (reader.result as string).split(',')[1];
        try {
          const response = await fetch('/api/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update-file',
              path,
              imageBuffer: base64Content,
              isImage: true,
              message: `Upload image: ${path}`,
            }),
          });
          const data = await response.json();
          if (data.success) {
            resolve(`${BASE_IMAGE_URL}/${path}`);
          } else {
            reject(new Error(data.error));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Generate ID helper
  const generateId = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  };

  // Add Category
  const addCategory = async () => {
    if (!addFormData.name || !addImageFile) {
      showMessage('error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const categoryId = addFormData.id || generateId(addFormData.name);
      const ext = addImageFile.name.split('.').pop() || 'png';
      const imagePath = `images/category/${categoryId}/${categoryId}.${ext}`;

      // Upload image
      const imageUrl = await uploadImageToGitHub(addImageFile, imagePath);

      // Add to categories list
      const newCategory: Category = {
        id: categoryId,
        name: addFormData.name,
        order: addFormData.order || categories.length + 1,
        image: imageUrl
      };

      const updatedCategories = [...categories, newCategory];

      // Save to GitHub
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-file',
          path: 'master/category/all.json',
          content: { total: updatedCategories.length, categories: updatedCategories },
          message: `Add category: ${newCategory.name}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCategories(updatedCategories);
        setFormMode(null);
        setAddFormData({});
        setAddImageFile(null);
        setAddImagePreview(null);
        setCompositeLabel(''); setCompositeBgColor('#FFF5E6'); setCompositeTextColor('#1a1a1a');
        setCompositePreview(null); setCompositeFile(null); setRawPhotoPreview(null); setRawPhotoFile(null);
        showMessage('success', 'Category added successfully');
      } else {
        showMessage('error', data.error || 'Failed to add category');
      }
    } catch (error) {
      showMessage('error', 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  // Add SubCategory
  const addSubCategory = async () => {
    if (!addFormData.name || !addImageFile || !selectedCategory) {
      showMessage('error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const subcategoryId = addFormData.id || generateId(addFormData.name);
      const ext = addImageFile.name.split('.').pop();
      const imagePath = `images/category/${selectedCategory.id}/sub-category/${subcategoryId}.${ext}`;

      // Upload image
      const imageUrl = await uploadImageToGitHub(addImageFile, imagePath);

      // Add to subcategories list
      const newSubCategory: SubCategory = {
        id: subcategoryId,
        name: addFormData.name,
        order: addFormData.order || subcategories.length + 1,
        image: imageUrl
      };

      const updatedSubCategories = [...subcategories, newSubCategory];

      // Save to GitHub
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-file',
          path: `master/category/${selectedCategory.id}/sub-categories.json`,
          content: {
            parent: { id: selectedCategory.id, name: selectedCategory.name },
            total: updatedSubCategories.length,
            subcategories: updatedSubCategories
          },
          message: `Add subcategory: ${newSubCategory.name}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubcategories(updatedSubCategories);
        setFormMode(null);
        setAddFormData({});
        setAddImageFile(null);
        setAddImagePreview(null);
        setCompositeLabel(''); setCompositeBgColor('#FFF5E6'); setCompositeTextColor('#1a1a1a');
        setCompositePreview(null); setCompositeFile(null); setRawPhotoPreview(null); setRawPhotoFile(null);
        showMessage('success', 'Subcategory added successfully');
      } else {
        showMessage('error', data.error || 'Failed to add subcategory');
      }
    } catch (error) {
      showMessage('error', 'Failed to add subcategory');
    } finally {
      setLoading(false);
    }
  };

  // Add Product
  const addProduct = async () => {
    if (!addFormData.name || !selectedCategory || !selectedSubCategory) {
      showMessage('error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Generate product ID
      const productId = addFormData._id || `prod_${Date.now()}`;

      // Upload product images
      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < productImages.length; i++) {
        const img = productImages[i];
        const ext = img.file.name.split('.').pop();
        const imagePath = `images/category/${selectedCategory.id}/sub-category/${selectedSubCategory.id}/products/${productId}_${i}.${ext}`;
        const imageUrl = await uploadImageToGitHub(img.file, imagePath);
        uploadedImageUrls.push(imageUrl);
      }

      // Create new product with timestamps
      const now = new Date().toISOString();
      const newProduct: Product = {
        _id: productId,
        name: addFormData.name,
        image: uploadedImageUrls.length > 0 ? uploadedImageUrls : addFormData.image || [],
        unit: addFormData.unit || '1 Piece',
        stock: addFormData.stock || 0,
        price: addFormData.price || 0,
        discount: addFormData.discount || 0,
        description: addFormData.description || '',
        more_details: addFormData.more_details || defaultMoreDetails,
        publish: addFormData.publish !== false,
        createdAt: now,
        updatedAt: now
      };

      const updatedProducts = [...products, newProduct];

      // Save to GitHub
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-file',
          path: `master/category/${selectedCategory.id}/sub-category/${selectedSubCategory.id}/products.json`,
          content: {
            parent: {
              category_id: selectedCategory.id,
              category_name: selectedCategory.name,
              subcategory_id: selectedSubCategory.id,
              subcategory_name: selectedSubCategory.name
            },
            total: updatedProducts.length,
            products: updatedProducts
          },
          message: `Add product: ${newProduct.name}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProducts(updatedProducts);
        setFormMode(null);
        setAddFormData({});
        setProductImages([]);
        setShowMoreDetails(false);
        showMessage('success', 'Product added successfully');
      } else {
        showMessage('error', data.error || 'Failed to add product');
      }
    } catch (error) {
      showMessage('error', 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  // Start editing category
  const startEditingCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditFormData({ ...category });
    setImagePreview(category.image);
    setNewImageFile(null);
  };

  // Save category
  const saveCategory = async () => {
    if (!editFormData) return;
    setLoading(true);
    try {
      let imageUrl = editFormData.image;

      if (newImageFile) {
        const ext = newImageFile.name.split('.').pop();
        const imagePath = `images/category/${editFormData.id}/${editFormData.id}.${ext}`;
        imageUrl = await uploadImageToGitHub(newImageFile, imagePath);
      }

      const updatedCategories = categories.map(cat =>
        cat.id === editFormData.id ? { ...editFormData, image: imageUrl } : cat
      );

      const getResponse = await fetch(`/api/github?action=get-file&path=master/category/all.json`);
      const getData = await getResponse.json();

      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-file',
          path: 'master/category/all.json',
          content: { total: updatedCategories.length, categories: updatedCategories },
          message: `Update category: ${editFormData.name}`,
          sha: getData.sha,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCategories(updatedCategories);
        setEditingCategoryId(null);
        setEditFormData(null);
        setNewImageFile(null);
        setImagePreview(null);
        showMessage('success', 'Category updated successfully');
      } else {
        showMessage('error', data.error || 'Failed to update category');
      }
    } catch (error) {
      showMessage('error', 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCategoryId(null);
    setEditingSubCategoryId(null);
    setEditingProductId(null);
    setEditFormData(null);
    setNewImageFile(null);
    setImagePreview(null);
    setEditProductImages([]);
    setShowMoreDetails(false);
    // Reset edit composite state
    setEditCompositeLabel('');
    setEditCompositeBgColor('#FFF5E6');
    setEditCompositeTextColor('#1a1a1a');
    setEditCompositePreview(null);
    setEditRawPhotoPreview(null);
    setEditRawPhotoFile(null);
  };

  // Delete category
  const deleteCategory = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

    setLoading(true);
    try {
      const updatedCategories = categories.filter(cat => cat.id !== category.id);

      const getResponse = await fetch(`/api/github?action=get-file&path=master/category/all.json`);
      const getData = await getResponse.json();

      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-file',
          path: 'master/category/all.json',
          content: { total: updatedCategories.length, categories: updatedCategories },
          message: `Delete category: ${category.name}`,
          sha: getData.sha,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCategories(updatedCategories);
        showMessage('success', 'Category deleted successfully');
      } else {
        showMessage('error', data.error || 'Failed to delete category');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  // Start editing subcategory
  const startEditingSubCategory = (subcat: SubCategory) => {
    setEditingSubCategoryId(subcat.id);
    setEditFormData({ ...subcat });
    setImagePreview(subcat.image);
    setNewImageFile(null);
  };

  // Save subcategory
  const saveSubCategory = async () => {
    if (!editFormData || !selectedCategory) return;
    setLoading(true);
    try {
      let imageUrl = editFormData.image;

      if (newImageFile) {
        const ext = newImageFile.name.split('.').pop();
        const imagePath = `images/category/${selectedCategory.id}/sub-category/${editFormData.id}.${ext}`;
        imageUrl = await uploadImageToGitHub(newImageFile, imagePath);
      }

      const updatedSubCategories = subcategories.map(sub =>
        sub.id === editFormData.id ? { ...editFormData, image: imageUrl } : sub
      );

      const getResponse = await fetch(`/api/github?action=get-file&path=master/category/${selectedCategory.id}/sub-categories.json`);
      const getData = await getResponse.json();

      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-file',
          path: `master/category/${selectedCategory.id}/sub-categories.json`,
          content: {
            parent: { id: selectedCategory.id, name: selectedCategory.name },
            total: updatedSubCategories.length,
            subcategories: updatedSubCategories
          },
          message: `Update subcategory: ${editFormData.name}`,
          sha: getData.sha,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubcategories(updatedSubCategories);
        setEditingSubCategoryId(null);
        setEditFormData(null);
        setNewImageFile(null);
        setImagePreview(null);
        showMessage('success', 'Subcategory updated successfully');
      } else {
        showMessage('error', data.error || 'Failed to update subcategory');
      }
    } catch (error) {
      showMessage('error', 'Failed to save subcategory');
    } finally {
      setLoading(false);
    }
  };

  // Delete subcategory
  const deleteSubCategory = async (subcat: SubCategory) => {
    if (!confirm(`Are you sure you want to delete "${subcat.name}"?`)) return;
    if (!selectedCategory) return;

    setLoading(true);
    try {
      const updatedSubCategories = subcategories.filter(sub => sub.id !== subcat.id);

      const getResponse = await fetch(`/api/github?action=get-file&path=master/category/${selectedCategory.id}/sub-categories.json`);
      const getData = await getResponse.json();

      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-file',
          path: `master/category/${selectedCategory.id}/sub-categories.json`,
          content: {
            parent: { id: selectedCategory.id, name: selectedCategory.name },
            total: updatedSubCategories.length,
            subcategories: updatedSubCategories
          },
          message: `Delete subcategory: ${subcat.name}`,
          sha: getData.sha,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubcategories(updatedSubCategories);
        showMessage('success', 'Subcategory deleted successfully');
      } else {
        showMessage('error', data.error || 'Failed to delete subcategory');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete subcategory');
    } finally {
      setLoading(false);
    }
  };

  // Start editing product
  const startEditingProduct = (product: Product) => {
    setEditingProductId(product._id);
    setEditFormData({ ...product, more_details: product.more_details || defaultMoreDetails });
    // Initialize edit product images with existing images
    setEditProductImages(product.image.map(img => ({ preview: img, isExisting: true })));
  };

  // Save product
  const saveProduct = async () => {
    if (!editFormData || !selectedCategory || !selectedSubCategory) return;
    setLoading(true);
    try {
      // Upload new images and keep existing ones
      const finalImageUrls: string[] = [];
      for (let i = 0; i < editProductImages.length; i++) {
        const img = editProductImages[i];
        if (img.isExisting) {
          finalImageUrls.push(img.preview);
        } else if (img.file) {
          const ext = img.file.name.split('.').pop();
          const imagePath = `images/category/${selectedCategory.id}/sub-category/${selectedSubCategory.id}/products/${editFormData._id}_${Date.now()}_${i}.${ext}`;
          const imageUrl = await uploadImageToGitHub(img.file, imagePath);
          finalImageUrls.push(imageUrl);
        }
      }

      const updatedProduct = {
        ...editFormData,
        image: finalImageUrls.length > 0 ? finalImageUrls : editFormData.image,
        updatedAt: new Date().toISOString()
      };

      const updatedProducts = products.map(prod =>
        prod._id === editFormData._id ? updatedProduct : prod
      );

      const getResponse = await fetch(`/api/github?action=get-file&path=master/category/${selectedCategory.id}/sub-category/${selectedSubCategory.id}/products.json`);
      const getData = await getResponse.json();

      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-file',
          path: `master/category/${selectedCategory.id}/sub-category/${selectedSubCategory.id}/products.json`,
          content: {
            parent: {
              category_id: selectedCategory.id,
              category_name: selectedCategory.name,
              subcategory_id: selectedSubCategory.id,
              subcategory_name: selectedSubCategory.name
            },
            total: updatedProducts.length,
            products: updatedProducts
          },
          message: `Update product: ${editFormData.name}`,
          sha: getData.sha,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProducts(updatedProducts);
        setEditingProductId(null);
        setEditFormData(null);
        setEditProductImages([]);
        setShowMoreDetails(false);
        showMessage('success', 'Product updated successfully');
      } else {
        showMessage('error', data.error || 'Failed to update product');
      }
    } catch (error) {
      showMessage('error', 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const deleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    if (!selectedCategory || !selectedSubCategory) return;

    setLoading(true);
    try {
      const updatedProducts = products.filter(prod => prod._id !== product._id);

      const getResponse = await fetch(`/api/github?action=get-file&path=master/category/${selectedCategory.id}/sub-category/${selectedSubCategory.id}/products.json`);
      const getData = await getResponse.json();

      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-file',
          path: `master/category/${selectedCategory.id}/sub-category/${selectedSubCategory.id}/products.json`,
          content: {
            parent: {
              category_id: selectedCategory.id,
              category_name: selectedCategory.name,
              subcategory_id: selectedSubCategory.id,
              subcategory_name: selectedSubCategory.name
            },
            total: updatedProducts.length,
            products: updatedProducts
          },
          message: `Delete product: ${product.name}`,
          sha: getData.sha,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProducts(updatedProducts);
        showMessage('success', 'Product deleted successfully');
      } else {
        showMessage('error', data.error || 'Failed to delete product');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to subcategories
  const navigateToSubCategories = (category: Category) => {
    setSelectedCategory(category);
    setViewMode('subcategories');
    fetchSubCategories(category.id);
  };

  // Navigate to products
  const navigateToProducts = (subcat: SubCategory) => {
    setSelectedSubCategory(subcat);
    setViewMode('products');
    if (selectedCategory) {
      fetchProducts(selectedCategory.id, subcat.id);
    }
  };

  // Filtered data based on search
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubCategories = subcategories.filter(sub =>
    sub.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(prod =>
    prod.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============================================
  // REUSABLE COMPONENTS
  // ============================================

  // Product Image Carousel with Dots (like B2C app)
  const ProductImageCarousel = ({
    images,
    size = 'normal',
    className = ''
  }: {
    images: string[];
    size?: 'small' | 'normal' | 'large';
    className?: string;
  }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const sizeClasses = {
      small: 'w-20 h-20',
      normal: 'w-24 h-24',
      large: 'w-32 h-32'
    };

    if (!images || images.length === 0) {
      return (
        <div className={`${sizeClasses[size]} bg-gray-200 rounded-lg flex items-center justify-center ${className}`}>
          <span className="text-xs text-gray-500">No image</span>
        </div>
      );
    }

    return (
      <div className={`${sizeClasses[size]} relative group ${className}`}>
        {/* Main Image */}
        <img
          src={images[currentIndex]}
          alt={`Product image ${currentIndex + 1}`}
          className="w-full h-full object-cover rounded-lg"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10">No Image</text></svg>';
          }}
        />

        {/* Navigation Arrows (show on hover if more than 1 image) */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
              }}
              className="absolute left-0.5 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
            >
              <ChevronLeft className="w-3 h-3 text-gray-700" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
              }}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
            >
              <ChevronRight className="w-3 h-3 text-gray-700" />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-blue-600 w-3'
                    : 'bg-gray-400 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        )}

        {/* Image Count Badge */}
        {images.length > 1 && (
          <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {currentIndex + 1}/{images.length}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // B2C PREVIEW COMPONENTS
  // ============================================

  // B2C Category Card Preview
  const B2CCategoryCard = ({ category }: { category: Category }) => (
    <div
      className="cursor-pointer hover:scale-105 transition-transform"
      onClick={() => navigateToSubCategories(category)}
    >
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-24 object-scale-down p-2"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="12">No Image</text></svg>';
          }}
        />
      </div>
    </div>
  );

  // B2C SubCategory Card Preview
  const B2CSubCategoryCard = ({ subcat, isActive }: { subcat: SubCategory; isActive: boolean }) => (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
        isActive ? 'bg-green-100 border-l-4 border-green-600' : 'hover:bg-gray-50'
      }`}
      onClick={() => navigateToProducts(subcat)}
    >
      <img
        src={subcat.image}
        alt={subcat.name}
        className="w-14 h-14 object-cover rounded-lg"
        onError={(e) => {
          e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="8">No Img</text></svg>';
        }}
      />
      <span className={`text-sm font-medium ${isActive ? 'text-green-700' : 'text-gray-700'}`}>
        {subcat.name}
      </span>
    </div>
  );

  // B2C Product Card Preview
  const B2CProductCard = ({ product }: { product: Product }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const discountedPrice = priceWithDiscount(product.price, product.discount);
    const images = product.image || [];

    return (
      <div className="border relative py-2 lg:p-4 grid gap-1 lg:gap-3 min-w-[120px] lg:min-w-[180px] rounded cursor-pointer bg-white hover:shadow-lg transition-shadow group">
        {/* Image Carousel */}
        <div className="min-h-20 w-full max-h-24 lg:max-h-32 rounded overflow-hidden relative">
          <img
            src={images[currentImageIndex] || ''}
            alt={product.name}
            className="w-full h-full object-scale-down lg:scale-110"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10">No Image</text></svg>';
            }}
          />

          {/* Navigation Arrows (show on hover) */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
                }}
                className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </button>
            </>
          )}

          {/* Dot Indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'bg-green-600 w-3'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Discount Badge */}
          {Boolean(product.discount) && (
            <p className="absolute top-2 right-2 text-green-600 bg-green-100 px-2 py-0.5 text-xs rounded-full shadow z-10">
              {product.discount}% OFF
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 px-2">
          <div className="rounded text-xs w-fit p-[1px] px-2 text-green-600 bg-green-50">
            10 min
          </div>
        </div>

        <div className="px-2 lg:px-0 font-medium text-ellipsis text-sm lg:text-base line-clamp-2">
          {product.name}
        </div>

        <div className="w-fit gap-1 px-2 lg:px-0 text-sm lg:text-base text-gray-500">
          {product.unit}
        </div>

        <div className="px-2 lg:px-0 flex items-center justify-between gap-1 lg:gap-3 text-sm lg:text-base">
          <div className="flex flex-col">
            <div className="font-semibold text-gray-900">
              {DisplayPriceInRupees(discountedPrice)}
            </div>
            {Boolean(product.discount) && (
              <div className="text-sm text-gray-400 line-through">
                {DisplayPriceInRupees(product.price)}
              </div>
            )}
          </div>

          <div>
            {product.stock === 0 ? (
              <p className="text-red-500 text-xs text-center">Out of stock</p>
            ) : (
              <button className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700">
                ADD
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // B2C Product Detail Preview
  const B2CProductDetailPreview = ({ product }: { product: Product }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const discountedPrice = priceWithDiscount(product.price, product.discount);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">B2C Product Detail Preview</h2>
            <button
              onClick={() => setEditFormData((prev: any) => prev ? { ...prev, _showPreview: false } : null)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 grid lg:grid-cols-2 gap-6">
            {/* Image Section */}
            <div>
              <div className="bg-white rounded-lg p-4 min-h-[300px] relative overflow-hidden">
                <img
                  src={product.image[currentImageIndex] || ''}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />

                {product.image.length > 1 && (
                  <div className="absolute inset-x-0 bottom-1/2 flex justify-between px-2">
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? product.image.length - 1 : prev - 1)}
                      className="bg-white p-1 rounded-full shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev === product.image.length - 1 ? 0 : prev + 1)}
                      className="bg-white p-1 rounded-full shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Thumbnail dots */}
              <div className="flex items-center justify-center gap-2 my-3">
                {product.image.map((_, index) => (
                  <button
                    key={index}
                    className={`w-3 h-3 rounded-full ${index === currentImageIndex ? 'bg-gray-600' : 'bg-gray-300'}`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2 overflow-x-auto">
                {product.image.map((img, index) => (
                  <div
                    key={index}
                    className={`w-16 h-16 cursor-pointer border-2 rounded ${index === currentImageIndex ? 'border-green-500' : 'border-gray-200'}`}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              <span className="bg-green-300 text-green-800 px-2 py-1 rounded-full text-sm">10 Min</span>
              <h1 className="text-2xl font-semibold">{product.name}</h1>
              <p className="text-gray-500">{product.unit}</p>

              <div className="border-t pt-4">
                <p className="text-gray-500 text-sm">Price</p>
                <div className="flex items-center gap-4 mt-1">
                  <div className="border border-green-600 px-4 py-2 rounded bg-green-50">
                    <span className="font-semibold text-xl">{DisplayPriceInRupees(discountedPrice)}</span>
                  </div>
                  {Boolean(product.discount) && (
                    <>
                      <span className="line-through text-gray-400">{DisplayPriceInRupees(product.price)}</span>
                      <span className="text-green-600 font-bold text-lg">{product.discount}% <span className="text-gray-500 text-sm font-normal">Discount</span></span>
                    </>
                  )}
                </div>
              </div>

              {product.stock === 0 ? (
                <p className="text-red-500 text-lg font-medium">Out of Stock</p>
              ) : (
                <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
                  Add to Cart
                </button>
              )}

              <div className="space-y-3 pt-4 border-t">
                <div>
                  <p className="font-semibold">Description</p>
                  <p className="text-gray-600 text-sm">{product.description || 'No description available'}</p>
                </div>
                <div>
                  <p className="font-semibold">Unit</p>
                  <p className="text-gray-600 text-sm">{product.unit}</p>
                </div>
                {product.more_details && Object.entries(product.more_details).map(([key, value]) => (
                  value && (
                    <div key={key}>
                      <p className="font-semibold">{key}</p>
                      <p className="text-gray-600 text-sm">{value}</p>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Add Form Modal
  const renderAddForm = () => {
    if (!formMode) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {formMode === 'add-category' && 'Add New Category'}
                {formMode === 'add-subcategory' && 'Add New Sub-Category'}
                {formMode === 'add-product' && 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setFormMode(null);
                  setAddFormData({});
                  setAddImageFile(null);
                  setAddImagePreview(null);
                  setProductImages([]);
                  setShowMoreDetails(false);
                  // Reset composite state
                  setCompositeLabel('');
                  setCompositeBgColor('#FFF5E6');
                  setCompositeTextColor('#1a1a1a');
                  setCompositePreview(null);
                  setCompositeFile(null);
                  setRawPhotoPreview(null);
                  setRawPhotoFile(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {(formMode === 'add-category' || formMode === 'add-subcategory') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID (auto-generated if empty)
                    </label>
                    <input
                      type="text"
                      value={addFormData.id || ''}
                      onChange={(e) => setAddFormData({ ...addFormData, id: e.target.value })}
                      placeholder="Leave empty to auto-generate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={addFormData.name || ''}
                      onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order
                    </label>
                    <input
                      type="number"
                      value={addFormData.order || ''}
                      onChange={(e) => setAddFormData({ ...addFormData, order: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Composite Image Builder (Blinkit-style) */}
                  <div className="border-2 border-dashed border-purple-300 rounded-xl p-4 bg-purple-50/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-800">Image Card Builder</h3>
                      <span className="text-xs text-purple-500 ml-auto">Photo + Label → Card Image</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Left: Inputs */}
                      <div className="space-y-3">
                        {/* Photo Upload */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Upload className="w-3 h-3 inline mr-1" /> Product Photo *
                          </label>
                          {rawPhotoPreview ? (
                            <div className="relative">
                              <img src={rawPhotoPreview} alt="Photo" className="w-full h-28 object-contain rounded-lg border bg-white" />
                              <button
                                onClick={() => { setRawPhotoFile(null); setRawPhotoPreview(null); setCompositePreview(null); setAddImageFile(null); setAddImagePreview(null); }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                              ><X className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-white">
                              <Upload className="w-8 h-8 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500">Upload PNG/JPG</p>
                              <p className="text-xs text-gray-400">(Max 5MB)</p>
                              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleRawPhotoUpload(e, false)} className="hidden" />
                            </label>
                          )}
                        </div>

                        {/* Label */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Type className="w-3 h-3 inline mr-1" /> Label Text *
                          </label>
                          <input
                            type="text"
                            value={compositeLabel}
                            onChange={(e) => setCompositeLabel(e.target.value)}
                            placeholder="e.g. Atta, Rice & Dal"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          />
                        </div>

                        {/* Background Color */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Palette className="w-3 h-3 inline mr-1" /> Background Color
                          </label>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {bgColorPresets.map((preset) => (
                              <button
                                key={preset.color}
                                onClick={() => setCompositeBgColor(preset.color)}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${compositeBgColor === preset.color ? 'border-purple-600 scale-110 shadow-md' : 'border-gray-200 hover:border-gray-400'}`}
                                style={{ backgroundColor: preset.color }}
                                title={preset.name}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="color" value={compositeBgColor} onChange={(e) => setCompositeBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                            <input type="text" value={compositeBgColor} onChange={(e) => setCompositeBgColor(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono" />
                          </div>
                        </div>

                        {/* Text Color */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setCompositeTextColor('#1a1a1a')} className={`px-3 py-1 rounded text-xs font-medium ${compositeTextColor === '#1a1a1a' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>Dark</button>
                            <button onClick={() => setCompositeTextColor('#ffffff')} className={`px-3 py-1 rounded text-xs font-medium ${compositeTextColor === '#ffffff' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>White</button>
                            <input type="color" value={compositeTextColor} onChange={(e) => setCompositeTextColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer" />
                          </div>
                        </div>

                        {/* Generate Button */}
                        <button
                          onClick={() => generateAndPreviewComposite(false)}
                          disabled={!rawPhotoPreview || !compositeLabel.trim()}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm"
                        >
                          <Sparkles className="w-4 h-4" />
                          Generate Card Image
                        </button>
                      </div>

                      {/* Right: Preview */}
                      <div className="flex flex-col items-center justify-center">
                        <label className="block text-sm font-medium text-gray-500 mb-2 text-center">Generated Preview</label>
                        {compositePreview ? (
                          <div className="space-y-2 text-center">
                            <img src={compositePreview} alt="Generated Card" className="w-48 h-48 object-contain rounded-2xl shadow-lg border" />
                            <p className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                              <CheckCircle className="w-3 h-3" /> 400×400px PNG Ready
                            </p>
                            <button
                              onClick={() => { setCompositePreview(null); setAddImageFile(null); setAddImagePreview(null); }}
                              className="text-red-500 text-xs hover:underline"
                            >
                              Clear & Regenerate
                            </button>
                          </div>
                        ) : (
                          <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-white text-gray-400">
                            <ImagePlus className="w-10 h-10 mb-2" />
                            <p className="text-xs text-center px-4">Upload photo & enter label, then click Generate</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Or upload directly */}
                    <div className="mt-4 pt-3 border-t border-purple-200">
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer hover:text-gray-700">Or upload a pre-made image directly</summary>
                        <div className="mt-2">
                          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                            <Upload className="w-4 h-4" />
                            Upload pre-made image (PNG, Max 2MB)
                            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAddImageUpload} className="hidden" />
                          </label>
                          {addImagePreview && !compositePreview && (
                            <div className="mt-2 flex items-center gap-2">
                              <img src={addImagePreview} alt="Uploaded" className="w-16 h-16 object-contain rounded border" />
                              <button onClick={() => { setAddImageFile(null); setAddImagePreview(null); }} className="text-red-500 text-xs hover:underline">Remove</button>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>
                </>
              )}

              {formMode === 'add-product' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={addFormData.name || ''}
                      onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Product Images Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Images (Multiple allowed)
                    </label>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {productImages.map((img, index) => (
                        <div key={index} className="relative">
                          <img
                            src={img.preview}
                            alt={`Product ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => removeProductImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <ImagePlus className="w-8 h-8 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">Add</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleProductImagesUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">Upload multiple images. First image will be the main image.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price *
                      </label>
                      <input
                        type="number"
                        value={addFormData.price || ''}
                        onChange={(e) => setAddFormData({ ...addFormData, price: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock
                      </label>
                      <input
                        type="number"
                        value={addFormData.stock || 0}
                        onChange={(e) => setAddFormData({ ...addFormData, stock: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={addFormData.unit || '1 Piece'}
                        onChange={(e) => setAddFormData({ ...addFormData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount %
                      </label>
                      <input
                        type="number"
                        value={addFormData.discount || 0}
                        onChange={(e) => setAddFormData({ ...addFormData, discount: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={addFormData.description || ''}
                      onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* More Details Section */}
                  <div className="border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 rounded-t-lg hover:bg-gray-100"
                    >
                      <span className="font-medium text-gray-700">More Details (Optional)</span>
                      <ChevronRight className={`w-5 h-5 transition-transform ${showMoreDetails ? 'rotate-90' : ''}`} />
                    </button>
                    {showMoreDetails && (
                      <div className="p-4 space-y-4">
                        {Object.keys(defaultMoreDetails).map((key) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {key}
                            </label>
                            <textarea
                              value={addFormData.more_details?.[key] || ''}
                              onChange={(e) => setAddFormData({
                                ...addFormData,
                                more_details: {
                                  ...defaultMoreDetails,
                                  ...addFormData.more_details,
                                  [key]: e.target.value
                                }
                              })}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder={`Enter ${key.toLowerCase()}...`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="publish"
                      checked={addFormData.publish !== false}
                      onChange={(e) => setAddFormData({ ...addFormData, publish: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="publish" className="text-sm font-medium text-gray-700">
                      Publish (visible in store)
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setFormMode(null);
                  setAddFormData({});
                  setAddImageFile(null);
                  setAddImagePreview(null);
                  setProductImages([]);
                  setShowMoreDetails(false);
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (formMode === 'add-category') addCategory();
                  else if (formMode === 'add-subcategory') addSubCategory();
                  else if (formMode === 'add-product') addProduct();
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add {formMode === 'add-category' ? 'Category' : formMode === 'add-subcategory' ? 'Sub-Category' : 'Product'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Publish Modal
  const renderPublishModal = () => {
    if (!showPublishModal) return null;

    // Helper to render step status icon
    const StepIcon = ({ status }: { status: PublishStep['status'] }) => {
      switch (status) {
        case 'completed':
          return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'in_progress':
          return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
        case 'failed':
          return <AlertCircle className="w-5 h-5 text-red-500" />;
        default:
          return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 sticky top-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Rocket className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">
                  {isPublishing ? 'Publishing...' : 'Publish New Version'}
                </h2>
              </div>
              <button
                onClick={() => {
                  if (!publishLoading) {
                    setShowPublishModal(false);
                    setIsPublishing(false);
                    setPublishSteps([]);
                  }
                }}
                disabled={publishLoading}
                className="p-1 hover:bg-white/20 rounded-lg transition disabled:opacity-50"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Show progress steps when publishing */}
            {isPublishing && publishSteps.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-5 h-5 text-green-600" />
                    <span className="text-lg font-semibold">Publishing {newVersion}</span>
                  </div>
                  <p className="text-sm text-gray-500">Deploying to B2C application...</p>
                </div>

                {/* Steps Progress */}
                <div className="space-y-3">
                  {publishSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border transition-all ${
                        step.status === 'completed' ? 'bg-green-50 border-green-200' :
                        step.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                        step.status === 'failed' ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <StepIcon status={step.status} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              step.status === 'completed' ? 'text-green-800' :
                              step.status === 'in_progress' ? 'text-blue-800' :
                              step.status === 'failed' ? 'text-red-800' :
                              'text-gray-600'
                            }`}>
                              {step.label}
                            </span>
                            {step.status === 'in_progress' && (
                              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                                In Progress
                              </span>
                            )}
                          </div>
                          {step.message && (
                            <p className={`text-sm mt-1 ${
                              step.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {step.message}
                            </p>
                          )}
                          {step.details && (
                            <code className="text-xs bg-white/50 px-2 py-1 rounded mt-2 block break-all text-gray-500">
                              {step.details.startsWith('http') ? (
                                <a href={step.details} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">
                                  {step.details}
                                </a>
                              ) : step.details}
                            </code>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Deployment Status */}
                {deploymentStatus && (
                  <div className={`p-4 rounded-lg border ${
                    deploymentStatus.conclusion === 'success' ? 'bg-green-50 border-green-200' :
                    deploymentStatus.conclusion === 'failure' ? 'bg-red-50 border-red-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5" />
                        <span className="font-medium">CI/CD Status</span>
                      </div>
                      {deploymentStatus.url && (
                        <a
                          href={deploymentStatus.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          View in GitHub
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm mt-1">
                      Status: <span className="font-medium capitalize">{deploymentStatus.hasWorkflows ? (deploymentStatus.status?.toLowerCase() || 'building') : 'Triggered'}</span>
                      {deploymentStatus.conclusion && (
                        <> • Conclusion: <span className="font-medium capitalize">{deploymentStatus.conclusion}</span></>
                      )}
                    </p>
                  </div>
                )}

                {/* Done message */}
                {!publishLoading && publishSteps.every(s => s.status === 'completed') && (
                  <div className="bg-green-100 border border-green-300 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800">Publish Complete!</p>
                        <p className="text-sm text-green-700">
                          Version {publishedVersion} has been published and deployed to the B2C app.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Current Version Info */}
                {latestRelease && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Current Live Version</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Tag className="w-5 h-5 text-green-600" />
                      <span className="text-lg font-semibold text-gray-900">{latestRelease.tag}</span>
                    </div>
                  </div>
                )}

                {/* New Version Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Version / Tag *
                  </label>
                  <div className="relative">
                    <Tag className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="2025-01-27_B1"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-mono"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Formats: <code className="bg-gray-100 px-1 rounded">2025-01-27_B1</code> (date-based) or <code className="bg-gray-100 px-1 rounded">v1.0.0</code> (semantic)
                  </p>
                </div>

                {/* Release Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Release Notes (Optional)
                  </label>
                  <textarea
                    value={releaseNotes}
                    onChange={(e) => setReleaseNotes(e.target.value)}
                    placeholder="Describe what changed in this version..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* What will happen */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-3">This will automatically:</p>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Create tag <code className="bg-blue-100 px-1 rounded">{newVersion || '2025-01-27_B1'}</code> in json-data-keeper
                    </li>
                    <li className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      Create GitHub Release with notes
                    </li>
                    <li className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Update B2C app <code className="bg-blue-100 px-1 rounded">.env</code> file:
                    </li>
                  </ul>
                  <div className="mt-2 ml-6 text-xs bg-blue-100 p-2 rounded font-mono">
                    NEXT_PUBLIC_API_URL=&apos;...@{newVersion}/kb-v2&apos;<br/>
                    CDN_BASE_URL=&apos;...@{newVersion}/kb-v2&apos;
                  </div>
                  <ul className="text-sm text-blue-700 space-y-2 mt-3">
                    <li className="flex items-center gap-2">
                      <Rocket className="w-4 h-4" />
                      Trigger CI/CD deployment (if configured)
                    </li>
                  </ul>
                </div>

                {/* CDN URL Preview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">B2C CDN URL:</p>
                  <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded break-all block">
                    https://cdn.jsdelivr.net/gh/iFrugal/json-data-keeper@{newVersion || 'v1.0.0'}/kb-v2/
                  </code>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Important</p>
                    <p>This will create a permanent tag and update the live B2C application. Make sure all changes are ready.</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 sticky bottom-0">
            {isPublishing && !publishLoading ? (
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setIsPublishing(false);
                  setPublishSteps([]);
                  setReleaseNotes('');
                }}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShowPublishModal(false);
                    setIsPublishing(false);
                    setPublishSteps([]);
                  }}
                  disabled={publishLoading}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={publishRelease}
                  disabled={publishLoading || !newVersion || isPublishing}
                  className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {publishLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      Publish {newVersion}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Categories</p>
              <p className="text-3xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <Package className="w-12 h-12 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Sub Categories</p>
              <p className="text-3xl font-bold text-gray-900">{subcategories.length > 0 ? subcategories.length : '-'}</p>
              <p className="text-xs text-gray-400 mt-1">Click a category to see count</p>
            </div>
            <FolderTree className="w-12 h-12 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Products</p>
              <p className="text-3xl font-bold text-gray-900">{products.length > 0 ? products.length : '-'}</p>
              <p className="text-xs text-gray-400 mt-1">Click a subcategory to see count</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setViewMode('categories')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Package className="w-4 h-4" />
            Manage Categories
          </button>
        </div>
      </div>

      {/* Publish Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg shadow-md border border-green-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Rocket className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Publish to B2C Store</h3>
              <p className="text-sm text-gray-600 mt-1">
                Create a new version tag to make your changes live in the B2C application.
              </p>
              {latestRelease ? (
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700">{latestRelease.tag}</span>
                    <span className="text-gray-500">- Current Live Version</span>
                  </div>
                  {latestRelease.publishedAt && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(latestRelease.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-amber-600 mt-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No releases yet. Publish your first version!
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              fetchLatestRelease();
              setShowPublishModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-sm"
          >
            <Rocket className="w-5 h-5" />
            Publish Changes
          </button>
        </div>
      </div>

      {/* GitHub Info */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <GitBranch className="w-4 h-4" />
              <span>Working Branch: <strong>main</strong></span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Repository: iFrugal/json-data-keeper/kb-v2
            </p>
          </div>
          <button
            onClick={fetchLatestRelease}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );

  // Render Categories
  const renderCategories = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Categories ({categories.length})</h2>
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              previewMode ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {previewMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {previewMode ? 'B2C Preview' : 'Admin View'}
          </button>
          <button
            onClick={() => setFormMode('add-category')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Category
          </button>
        </div>
      </div>

      {previewMode ? (
        // B2C Preview Mode - Grid Layout like Homepage
        <div className="bg-gray-100 p-6 rounded-lg">
          <p className="text-sm text-gray-500 mb-4">B2C Homepage Preview - Categories Grid</p>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {filteredCategories.map((category) => (
              <B2CCategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      ) : (
        // Admin List View
        <div className="space-y-3">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-white p-4 rounded-lg shadow-md">
              {editingCategoryId === category.id ? (
                <div className="space-y-4 p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
                  <p className="font-semibold text-blue-800">EDITING MODE</p>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={editFormData?.name || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                        <input
                          type="number"
                          value={editFormData?.order || 0}
                          onChange={(e) => setEditFormData({ ...editFormData, order: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID (read-only)</label>
                      <input type="text" value={editFormData?.id || ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
                    </div>
                  </div>

                  {/* Current Image + Composite Regeneration */}
                  <div className="border rounded-lg p-3 bg-white">
                    <p className="text-sm font-medium text-gray-700 mb-2">Current Image</p>
                    <div className="flex items-start gap-4">
                      <div>
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="w-32 h-32 object-contain rounded-xl border" />
                        ) : (
                          <div className="w-32 h-32 bg-gray-200 rounded-xl flex items-center justify-center">
                            <Upload className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                          <Upload className="w-4 h-4" />
                          Upload pre-made image
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>

                        <details className="text-xs">
                          <summary className="cursor-pointer text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Or regenerate composite card
                          </summary>
                          <div className="mt-2 space-y-2 p-2 bg-purple-50 rounded-lg">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Photo</label>
                              {editRawPhotoPreview ? (
                                <div className="relative inline-block">
                                  <img src={editRawPhotoPreview} alt="Photo" className="w-20 h-20 object-contain rounded border bg-white" />
                                  <button onClick={() => { setEditRawPhotoFile(null); setEditRawPhotoPreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                                </div>
                              ) : (
                                <label className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded cursor-pointer text-xs hover:bg-gray-50">
                                  <Upload className="w-3 h-3" /> Upload photo
                                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleRawPhotoUpload(e, true)} className="hidden" />
                                </label>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                              <input type="text" value={editCompositeLabel} onChange={(e) => setEditCompositeLabel(e.target.value)} placeholder="e.g. Atta, Rice & Dal" className="w-full px-2 py-1 border rounded text-xs" />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600">BG:</label>
                              <div className="flex gap-1">
                                {bgColorPresets.slice(0, 6).map((p) => (
                                  <button key={p.color} onClick={() => setEditCompositeBgColor(p.color)} className={`w-5 h-5 rounded-full border ${editCompositeBgColor === p.color ? 'border-purple-600 scale-110' : 'border-gray-200'}`} style={{ backgroundColor: p.color }} />
                                ))}
                              </div>
                              <input type="color" value={editCompositeBgColor} onChange={(e) => setEditCompositeBgColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer" />
                            </div>
                            <button
                              onClick={() => generateAndPreviewComposite(true)}
                              disabled={!editRawPhotoPreview || !editCompositeLabel.trim()}
                              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-40"
                            >
                              <Sparkles className="w-3 h-3" /> Generate
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={cancelEditing}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={saveCategory}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999">No Image</text></svg>';
                    }}
                  />
                  <div className="flex-1">
                    <h3
                      className="text-lg font-semibold cursor-pointer hover:text-blue-600"
                      onClick={() => navigateToSubCategories(category)}
                    >
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500">Order: {category.order} | ID: {category.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditingCategory(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render SubCategories
  const renderSubCategories = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => {
            setViewMode('categories');
            setSelectedCategory(null);
            setSubcategories([]);
            setPreviewMode(false);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">
          {selectedCategory?.name} &gt; Sub-Categories ({subcategories.length})
        </h2>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              previewMode ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {previewMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {previewMode ? 'B2C Preview' : 'Admin View'}
          </button>
          <button
            onClick={() => setFormMode('add-subcategory')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Sub-Category
          </button>
        </div>
      </div>

      {previewMode ? (
        // B2C Preview Mode - Sidebar Style
        <div className="bg-gray-100 p-6 rounded-lg">
          <p className="text-sm text-gray-500 mb-4">B2C Sidebar Preview - Sub-Categories List</p>
          <div className="bg-white rounded-lg p-4 max-w-xs space-y-2">
            {filteredSubCategories.map((subcat, index) => (
              <B2CSubCategoryCard
                key={subcat.id}
                subcat={subcat}
                isActive={index === 0}
              />
            ))}
          </div>
        </div>
      ) : (
        // Admin List View
        <div className="space-y-3">
          {filteredSubCategories.map((subcat) => (
            <div key={subcat.id} className="bg-white p-4 rounded-lg shadow-md">
              {editingSubCategoryId === subcat.id ? (
                <div className="space-y-4 p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
                  <p className="font-semibold text-blue-800">EDITING MODE</p>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={editFormData?.name || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                        <input
                          type="number"
                          value={editFormData?.order || 0}
                          onChange={(e) => setEditFormData({ ...editFormData, order: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID (read-only)</label>
                      <input type="text" value={editFormData?.id || ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
                    </div>
                  </div>

                  {/* Current Image + Composite Regeneration */}
                  <div className="border rounded-lg p-3 bg-white">
                    <p className="text-sm font-medium text-gray-700 mb-2">Current Image</p>
                    <div className="flex items-start gap-4">
                      <div>
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="w-32 h-32 object-contain rounded-xl border" />
                        ) : (
                          <div className="w-32 h-32 bg-gray-200 rounded-xl flex items-center justify-center">
                            <Upload className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                          <Upload className="w-4 h-4" />
                          Upload pre-made image
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>

                        <details className="text-xs">
                          <summary className="cursor-pointer text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Or regenerate composite card
                          </summary>
                          <div className="mt-2 space-y-2 p-2 bg-purple-50 rounded-lg">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Photo</label>
                              {editRawPhotoPreview ? (
                                <div className="relative inline-block">
                                  <img src={editRawPhotoPreview} alt="Photo" className="w-20 h-20 object-contain rounded border bg-white" />
                                  <button onClick={() => { setEditRawPhotoFile(null); setEditRawPhotoPreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                                </div>
                              ) : (
                                <label className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded cursor-pointer text-xs hover:bg-gray-50">
                                  <Upload className="w-3 h-3" /> Upload photo
                                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleRawPhotoUpload(e, true)} className="hidden" />
                                </label>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                              <input type="text" value={editCompositeLabel} onChange={(e) => setEditCompositeLabel(e.target.value)} placeholder="e.g. Rice Bran" className="w-full px-2 py-1 border rounded text-xs" />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600">BG:</label>
                              <div className="flex gap-1">
                                {bgColorPresets.slice(0, 6).map((p) => (
                                  <button key={p.color} onClick={() => setEditCompositeBgColor(p.color)} className={`w-5 h-5 rounded-full border ${editCompositeBgColor === p.color ? 'border-purple-600 scale-110' : 'border-gray-200'}`} style={{ backgroundColor: p.color }} />
                                ))}
                              </div>
                              <input type="color" value={editCompositeBgColor} onChange={(e) => setEditCompositeBgColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer" />
                            </div>
                            <button
                              onClick={() => generateAndPreviewComposite(true)}
                              disabled={!editRawPhotoPreview || !editCompositeLabel.trim()}
                              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-40"
                            >
                              <Sparkles className="w-3 h-3" /> Generate
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={cancelEditing}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={saveSubCategory}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <img
                    src={subcat.image}
                    alt={subcat.name}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999">No Image</text></svg>';
                    }}
                  />
                  <div className="flex-1">
                    <h3
                      className="text-lg font-semibold cursor-pointer hover:text-blue-600"
                      onClick={() => navigateToProducts(subcat)}
                    >
                      {subcat.name}
                    </h3>
                    <p className="text-sm text-gray-500">Order: {subcat.order} | ID: {subcat.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditingSubCategory(subcat)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteSubCategory(subcat)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render Products
  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => {
            setViewMode('subcategories');
            setSelectedSubCategory(null);
            setProducts([]);
            setPreviewMode(false);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">
          {selectedCategory?.name} &gt; {selectedSubCategory?.name} &gt; Products ({products.length})
        </h2>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              previewMode ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {previewMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {previewMode ? 'B2C Preview' : 'Admin View'}
          </button>
          <button
            onClick={() => setFormMode('add-product')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Product
          </button>
        </div>
      </div>

      {previewMode ? (
        // B2C Preview Mode - Product Cards Grid
        <div className="bg-gray-100 p-6 rounded-lg">
          <p className="text-sm text-gray-500 mb-4">B2C Product List Preview - Click a product to see detail view</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <div key={product._id} onClick={() => startEditingProduct(product)}>
                <B2CProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Admin List View
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <div key={product._id} className="bg-white p-4 rounded-lg shadow-md">
              {editingProductId === product._id ? (
                <div className="space-y-4 p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-blue-800">EDITING MODE</p>
                    <button
                      onClick={() => {
                        // Show B2C preview modal
                        setEditFormData({ ...product, more_details: product.more_details || defaultMoreDetails, _showPreview: true });
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      <Eye className="w-4 h-4" />
                      B2C Preview
                    </button>
                  </div>

                  {/* Product Images Edit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
                    <div className="flex flex-wrap gap-3">
                      {editProductImages.map((img, index) => (
                        <div key={index} className="relative">
                          <img
                            src={img.preview}
                            alt={`Product ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => removeEditProductImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {index === 0 && (
                            <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1 rounded">Main</span>
                          )}
                        </div>
                      ))}
                      <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-white">
                        <ImagePlus className="w-8 h-8 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">Add</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleEditProductImagesUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={editFormData?.name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={editFormData?.unit || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input
                        type="number"
                        value={editFormData?.price || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                      <input
                        type="number"
                        value={editFormData?.stock || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, stock: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                      <input
                        type="number"
                        value={editFormData?.discount || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, discount: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="edit-publish"
                        checked={editFormData?.publish !== false}
                        onChange={(e) => setEditFormData({ ...editFormData, publish: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="edit-publish" className="text-sm font-medium text-gray-700">
                        Published
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editFormData?.description || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* More Details Section */}
                  <div className="border rounded-lg bg-white">
                    <button
                      type="button"
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 rounded-t-lg hover:bg-gray-100"
                    >
                      <span className="font-medium text-gray-700">More Details</span>
                      <ChevronRight className={`w-5 h-5 transition-transform ${showMoreDetails ? 'rotate-90' : ''}`} />
                    </button>
                    {showMoreDetails && (
                      <div className="p-4 space-y-4">
                        {Object.keys(defaultMoreDetails).map((key) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {key}
                            </label>
                            <textarea
                              value={editFormData?.more_details?.[key] || ''}
                              onChange={(e) => setEditFormData({
                                ...editFormData,
                                more_details: {
                                  ...defaultMoreDetails,
                                  ...editFormData.more_details,
                                  [key]: e.target.value
                                }
                              })}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder={`Enter ${key.toLowerCase()}...`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={cancelEditing}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={saveProduct}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {/* Product Image Carousel with Dots */}
                  <ProductImageCarousel images={product.image} size="normal" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    <p className="text-sm text-gray-500">
                      {DisplayPriceInRupees(product.price)} | {product.unit} | Stock: {product.stock}
                      {product.discount ? ` | ${product.discount}% off` : ''}
                    </p>
                    {!product.publish && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Unpublished</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditingProduct(product)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteProduct(product)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* B2C Product Detail Preview Modal */}
      {editFormData?._showPreview && (
        <B2CProductDetailPreview
          product={{
            ...editFormData,
            image: editProductImages.map(img => img.preview)
          }}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">KB Masale Admin</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setViewMode('dashboard');
                  setSelectedCategory(null);
                  setSelectedSubCategory(null);
                  setEditingCategoryId(null);
                  setEditingSubCategoryId(null);
                  setEditingProductId(null);
                  setPreviewMode(false);
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Dashboard
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                >
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                      {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="text-sm text-gray-700 hidden sm:inline">
                    {session?.user?.name || session?.user?.email}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          {session?.user?.image ? (
                            <img
                              src={session.user.image}
                              alt={session.user.name || 'User'}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                              {session?.user?.name?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {session?.user?.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {session?.user?.email}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                          <Shield className="w-3 h-3" />
                          <span>Authorized Admin</span>
                        </div>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p className="font-medium">{message.text}</p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white px-8 py-6 rounded-lg shadow-xl flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-lg font-medium">Processing...</p>
          </div>
        </div>
      )}

      {/* Add Form Modal */}
      {renderAddForm()}

      {/* Publish Modal */}
      {renderPublishModal()}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {viewMode === 'dashboard' && renderDashboard()}
        {viewMode === 'categories' && renderCategories()}
        {viewMode === 'subcategories' && renderSubCategories()}
        {viewMode === 'products' && renderProducts()}
      </main>
    </div>
  );
}
