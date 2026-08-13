import type React from 'react';
import type { UserRequirements, UISpecification, ContentMap, SEOMetadata } from '../../core/entities/PipelineState';

export interface TemplateProps {
  requirements: UserRequirements;
  ui_spec: UISpecification;
  content?: ContentMap;
  seo?: SEOMetadata;
}

export interface ITemplateBlueprint {
  id: string;
  name: string;
  category: UserRequirements['category'];
  filePath: string;
  renderCode: (props: TemplateProps) => string;
  renderComponent: (props: TemplateProps) => React.ReactNode;
}
