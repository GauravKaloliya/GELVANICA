"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Check,
  Tag,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { configService } from "@/lib/services/configService";

interface EntityType {
  id: string;
  workspace_id: string;
  name: string;
  icon: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
}

interface CustomProperty {
  id: string;
  workspace_id: string;
  entity_type_id: string;
  name: string;
  property_type: string;
  config: Record<string, unknown> | null;
  created_at: string;
}

export default function EntityTypesPage() {
  const params = useParams();
  const { tokens } = useAuthStore();
  const workspaceId = params.id as string;
  const token = tokens?.access_token;

  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [properties, setProperties] = useState<CustomProperty[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingType, setCreatingType] = useState(false);
  const [creatingProperty, setCreatingProperty] = useState(false);
  const [savedType, setSavedType] = useState(false);
  const [savedProperty, setSavedProperty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeIcon, setNewTypeIcon] = useState("");
  const [newPropertyName, setNewPropertyName] = useState("");
  const [newPropertyType, setNewPropertyType] = useState<string>("");
  const [newPropertyEntityTypeId, setNewPropertyEntityTypeId] = useState("");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [typesJson, propsJson, configJson] = await Promise.all([
        apiClient.get<{ data: EntityType[] }>(`/workspaces/${workspaceId}/entities/types`),
        apiClient.get<{ data: CustomProperty[] }>(`/workspaces/${workspaceId}/entities/properties`),
        configService.get(workspaceId),
      ]);
      setEntityTypes(typesJson.data || []);
      setProperties(propsJson.data || []);
      setPropertyTypes(configJson.property_types ?? []);
      if ((configJson.property_types ?? []).length > 0) {
        setNewPropertyType(configJson.property_types[0]);
      }
    } catch {
      setError("Failed to load entity types and properties.");
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTypeName.trim()) return;
    setCreatingType(true);
    setError(null);
    try {
      const data = await apiClient.post<{ data: EntityType }>(`/workspaces/${workspaceId}/entities/types`, {
        workspace_id: workspaceId,
        name: newTypeName.trim(),
        icon: newTypeIcon.trim() || null,
        config: null,
      });
      setEntityTypes((prev) => [...prev, data.data]);
      setNewTypeName("");
      setNewTypeIcon("");
      setSavedType(true);
      setTimeout(() => setSavedType(false), 2000);
    } catch {
      setError("Failed to create entity type");
    } finally {
      setCreatingType(false);
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPropertyName.trim() || !newPropertyEntityTypeId) return;
    setCreatingProperty(true);
    setError(null);
    try {
      const data = await apiClient.post<{ data: CustomProperty }>(`/workspaces/${workspaceId}/entities/properties`, {
        workspace_id: workspaceId,
        entity_type_id: newPropertyEntityTypeId,
        name: newPropertyName.trim(),
        property_type: newPropertyType,
        config: null,
      });
      setProperties((prev) => [...prev, data.data]);
      setNewPropertyName("");
      setNewPropertyType(propertyTypes[0] || "");
      setNewPropertyEntityTypeId("");
      setSavedProperty(true);
      setTimeout(() => setSavedProperty(false), 2000);
    } catch {
      setError("Failed to create property");
    } finally {
      setCreatingProperty(false);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!token) return;
    try {
      await apiClient.delete(`/workspaces/${workspaceId}/entities/types/${id}`);
      setEntityTypes((prev) => prev.filter((t) => t.id !== id));
      setProperties((prev) => prev.filter((p) => p.entity_type_id !== id));
    } catch {
      setError("Failed to delete entity type.");
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!token) return;
    try {
      await apiClient.delete(`/workspaces/${workspaceId}/properties/${id}`);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Failed to delete property.");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-8">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-64" />
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-3">
            <Skeleton variant="rectangular" className="h-10 w-20 rounded-lg" />
            <Skeleton variant="rectangular" className="h-10 flex-1 rounded-lg" />
          </div>
          <Skeleton variant="rectangular" className="h-10 w-28 rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-4 py-3">
              <Skeleton className="h-6 w-6 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link
          href={`/workspace/${workspaceId}/settings`}
          className="hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link
          href={`/workspace/${workspaceId}/settings`}
          className="hover:text-foreground"
        >
          Settings
        </Link>
        <span>/</span>
        <span className="text-foreground">Entity Types</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground display-heading">Entity Types & Properties</h1>
        <p className="mt-1 text-step-3 text-muted">
          Manage custom entity types and their properties for this workspace
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
            <button
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-300"
            aria-label="Dismiss error"
          >
            <X className="inline h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Create Entity Type */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground display-heading">
          <Tag className="h-5 w-5 text-muted" />
          Create Entity Type
        </h2>
        <p className="mt-1 text-step-3 text-muted">
          Define a new type of entity for your workspace
        </p>

        <form onSubmit={handleCreateType} className="mt-6 space-y-4">
          <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
            <div>
              <label htmlFor="new-type-icon" className="block text-sm font-medium text-muted mb-1.5">
                Icon
              </label>
              <input
                id="new-type-icon"
                type="text"
                value={newTypeIcon}
                onChange={(e) => setNewTypeIcon(e.target.value)}
                placeholder="e.g. 📝"
                className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-center text-lg text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="new-type-name" className="block text-sm font-medium text-muted mb-1.5">
                Name
              </label>
              <input
                id="new-type-name"
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="e.g. RFC, Ticket, Spec"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                required
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={creatingType || !newTypeName.trim()}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                savedType
                  ? "bg-green-600 text-foreground"
                  : "bg-card text-foreground hover:bg-surface"
              )}
            >
              {creatingType ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedType ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {savedType ? "Created!" : "Create Type"}
            </button>
          </div>
        </form>
      </div>

      {/* Entity Types List */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground display-heading">
          Entity Types{" "}
          <span className="text-step-3 font-normal text-muted">
            ({entityTypes.length})
          </span>
        </h2>

        <div className="mt-4 space-y-1">
          {entityTypes.map((entityType) => {
            const typeProperties = properties.filter(
              (p) => p.entity_type_id === entityType.id
            );
            return (
              <div
                key={entityType.id}
                className="group flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-surface"
              >
                <span className="text-xl">
                  {entityType.icon || "📄"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-step-3 font-medium text-foreground">
                    {entityType.name}
                  </p>
                  <p className="text-step-1 text-muted">
                    {typeProperties.length} propert{typeProperties.length === 1 ? "y" : "ies"}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteType(entityType.id)}
                  className="rounded p-1.5 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  aria-label={`Delete ${entityType.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {entityTypes.length === 0 && (
          <div className="py-8 text-center">
            <Tag className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2 text-step-3 text-muted">No entity types yet</p>
          </div>
        )}
      </div>

      {/* Create Custom Property */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground display-heading">Create Custom Property</h2>
        <p className="mt-1 text-step-3 text-muted">
          Add a custom property to an entity type
        </p>

        <form onSubmit={handleCreateProperty} className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-property-entity-type" className="block text-sm font-medium text-muted mb-1.5">
              Entity Type
            </label>
            <select
              id="new-property-entity-type"
              value={newPropertyEntityTypeId}
              onChange={(e) => setNewPropertyEntityTypeId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              required
            >
              <option value="" className="bg-surface">
                Select entity type...
              </option>
              {entityTypes.map((et) => (
                <option key={et.id} value={et.id} className="bg-surface">
                  {et.icon ? `${et.icon} ` : ""}
                  {et.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-property-name" className="block text-sm font-medium text-muted mb-1.5">
              Property Name
            </label>
            <input
              id="new-property-name"
              type="text"
              value={newPropertyName}
              onChange={(e) => setNewPropertyName(e.target.value)}
              placeholder="e.g. Priority, Status, Due Date"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="new-property-type" className="block text-sm font-medium text-muted mb-1.5">
              Property Type
            </label>
            <select
              id="new-property-type"
              value={newPropertyType}
              onChange={(e) => setNewPropertyType(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              {propertyTypes.map((pt) => (
                <option key={pt} value={pt} className="bg-surface">
                  {pt.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              type="submit"
              disabled={
                creatingProperty ||
                !newPropertyName.trim() ||
                !newPropertyEntityTypeId
              }
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                savedProperty
                  ? "bg-green-600 text-foreground"
                  : "bg-card text-foreground hover:bg-surface"
              )}
            >
              {creatingProperty ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedProperty ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {savedProperty ? "Created!" : "Create Property"}
            </button>
          </div>
        </form>
      </div>

      {/* Properties List */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground display-heading">
          Custom Properties{" "}
          <span className="text-step-3 font-normal text-muted">
            ({properties.length})
          </span>
        </h2>

        <div className="mt-4 space-y-1">
          {properties.map((prop) => {
            const entityType = entityTypes.find(
              (et) => et.id === prop.entity_type_id
            );
            return (
              <div
                key={prop.id}
                className="group flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-surface"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-step-3 font-medium text-foreground">{prop.name}</p>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
                      {prop.property_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-step-1 text-muted">
                    {entityType?.icon ? `${entityType.icon} ` : ""}
                    {entityType?.name || "Unknown type"}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteProperty(prop.id)}
                  className="rounded p-1.5 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  aria-label={`Delete ${prop.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {properties.length === 0 && (
          <div className="py-8 text-center">
            <Tag className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2 text-step-3 text-muted">
              No custom properties yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
