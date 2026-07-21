export interface ComponentReference {
  namespace: string;
  name: string;
  start: number;
  end: number;
}

export interface TemplateReference {
  namespace: string;
  name: string;
  templateName: string;
  start: number;
  end: number;
}

export interface IncludeComponentCall {
  component: ComponentReference;
  template: TemplateReference;
}
