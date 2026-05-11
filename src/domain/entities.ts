export interface VariableDeclaration {
  name: string;
  default?: string;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  variables: VariableDeclaration[];
  content: string;
  createdAt: Date;
}

export interface Template {
  id: string;
  name: string;
  tags: string[];
  createdAt: Date;
}
