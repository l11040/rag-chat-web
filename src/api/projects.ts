import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from './client';
import type {
  CreateProjectDto,
  UpdateProjectDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  AddNotionPagesDto,
  AddSwaggerDocumentsDto,
} from './generated/models';

// 프로젝트 타입 정의 (API 응답 타입)
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  notionPages: any[];
  swaggerDocuments: any[];
}

export interface ProjectMember {
  id: string;
  userId: string;
  role: 'member' | 'project_manager';
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface SelectableNotionPage {
  id: string;
  pageId: string;
  title?: string;
  databaseId?: string;
  url?: string;
  [key: string]: any;
}

export interface SelectableSwaggerDocument {
  id: string;
  key: string;
  swaggerUrl?: string;
  [key: string]: any;
}

/**
 * 내 프로젝트 목록 조회
 */
export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectsApi.getMyProjects();
      return (response.data as unknown) as Project[];
    },
  });
}

/**
 * 프로젝트 상세 조회
 */
export function useProject(projectId: string | null) {
  return useQuery<ProjectDetail>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('프로젝트 ID가 필요합니다.');
      const response = await projectsApi.getProject({ projectId });
      return (response.data as unknown) as ProjectDetail;
    },
    enabled: !!projectId,
  });
}

/**
 * 프로젝트 멤버 목록 조회
 */
export function useProjectMembers(projectId: string | null) {
  return useQuery<ProjectMember[]>({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('프로젝트 ID가 필요합니다.');
      const response = await projectsApi.getProjectMembers({ projectId });
      return (response.data as unknown) as ProjectMember[];
    },
    enabled: !!projectId,
  });
}

/**
 * 프로젝트에 추가 가능한 Notion 페이지 목록 조회
 */
export function useSelectableNotionPages() {
  return useQuery<SelectableNotionPage[]>({
    queryKey: ['selectable-notion-pages'],
    queryFn: async () => {
      const response = await projectsApi.getSelectableNotionPages();
      const data = response.data as any;
      
      let pageList: SelectableNotionPage[] = [];
      
      if (Array.isArray(data)) {
        pageList = data;
      } else if (data && Array.isArray(data.pages)) {
        pageList = data.pages;
      } else if (data && Array.isArray(data.data)) {
        pageList = data.data;
      } else if (data && typeof data === 'object') {
        const values = Object.values(data);
        if (values.length > 0 && Array.isArray(values[0])) {
          pageList = values[0] as SelectableNotionPage[];
        }
      }
      
      return pageList;
    },
  });
}

/**
 * 프로젝트에 추가 가능한 Swagger 문서 목록 조회
 */
export function useSelectableSwaggerDocuments() {
  return useQuery<SelectableSwaggerDocument[]>({
    queryKey: ['selectable-swagger-documents'],
    queryFn: async () => {
      const response = await projectsApi.getSelectableSwaggerDocuments();
      const data = response.data as any;
      
      let documentList: SelectableSwaggerDocument[] = [];
      
      if (Array.isArray(data)) {
        documentList = data;
      } else if (data && Array.isArray(data.documents)) {
        documentList = data.documents;
      } else if (data && Array.isArray(data.data)) {
        documentList = data.data;
      } else if (data && typeof data === 'object') {
        const values = Object.values(data);
        if (values.length > 0 && Array.isArray(values[0])) {
          documentList = values[0] as SelectableSwaggerDocument[];
        }
      }
      
      return documentList;
    },
  });
}

/**
 * 프로젝트 생성 Mutation (서브 관리자/관리자만)
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, CreateProjectDto>({
    mutationFn: async (data) => {
      const response = await projectsApi.createProject({ createProjectDto: data });
      return (response.data as unknown) as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * 프로젝트 수정 Mutation
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { projectId: string; data: UpdateProjectDto }>({
    mutationFn: async ({ projectId, data }) => {
      await projectsApi.updateProject({ projectId, updateProjectDto: data });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

/**
 * 프로젝트 삭제 Mutation
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (projectId) => {
      await projectsApi.deleteProject({ projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * 프로젝트에 멤버 추가 Mutation
 */
export function useAddProjectMember() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { projectId: string; data: AddMemberDto }>({
    mutationFn: async ({ projectId, data }) => {
      await projectsApi.addMember({ projectId, addMemberDto: data });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

/**
 * 프로젝트 멤버 역할 변경 Mutation
 */
export function useUpdateProjectMemberRole() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { projectId: string; userId: string; data: UpdateMemberRoleDto }>({
    mutationFn: async ({ projectId, userId, data }) => {
      await projectsApi.updateMemberRole({ projectId, userId, updateMemberRoleDto: data });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

/**
 * 프로젝트에서 멤버 제거 Mutation
 */
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { projectId: string; userId: string }>({
    mutationFn: async ({ projectId, userId }) => {
      await projectsApi.removeMember({ projectId, userId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

/**
 * 프로젝트에 Notion 페이지 추가 Mutation
 */
export function useAddProjectNotionPages() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { projectId: string; data: AddNotionPagesDto }>({
    mutationFn: async ({ projectId, data }) => {
      await projectsApi.addNotionPages({ projectId, addNotionPagesDto: data });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['selectable-notion-pages'] });
    },
  });
}

/**
 * 프로젝트에서 Notion 페이지 제거 Mutation
 */
export function useRemoveProjectNotionPage() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { projectId: string; notionPageId: string }>({
    mutationFn: async ({ projectId, notionPageId }) => {
      await projectsApi.removeNotionPage({ projectId, notionPageId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['selectable-notion-pages'] });
    },
  });
}

/**
 * 프로젝트에 Swagger 문서 추가 Mutation
 */
export function useAddProjectSwaggerDocuments() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { projectId: string; data: AddSwaggerDocumentsDto }>({
    mutationFn: async ({ projectId, data }) => {
      await projectsApi.addSwaggerDocuments({ projectId, addSwaggerDocumentsDto: data });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['selectable-swagger-documents'] });
    },
  });
}

/**
 * 프로젝트에서 Swagger 문서 제거 Mutation
 */
export function useRemoveProjectSwaggerDocument() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { projectId: string; swaggerDocumentId: string }>({
    mutationFn: async ({ projectId, swaggerDocumentId }) => {
      await projectsApi.removeSwaggerDocument({ projectId, swaggerDocumentId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['selectable-swagger-documents'] });
    },
  });
}

