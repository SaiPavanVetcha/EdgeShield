export interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  category: string;
}

export interface WorkflowAsset {
  id: string;
  name: string;
  filename: string;
  description: string;
  sourceUrl?: string;
  isCustom?: boolean;
}
