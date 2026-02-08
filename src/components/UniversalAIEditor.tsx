import { useState, useRef, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  List, ListOrdered, Table as TableIcon, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Heading4,
  Palette, Link as LinkIcon, Highlighter, Quote, Code,
  Plus, Minus, RowsIcon, ColumnsIcon, Trash2, FileText,
  Sparkles, Wand2, Loader2, Eye, EyeOff, Image, Video,
  Upload, X, Hash, Type, MessageSquare, Zap, Send, RefreshCw
} from 'lucide-react';

interface UniversalAIEditorProps {
  onSubmit: (data: {
    title: string;
    hook: string;
    content: string;
    hashtags: string[];
    category: string;
    mediaFiles: File[];
  }) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
  showMediaUpload?: boolean;
  maxMediaSize?: number; // in MB
}

const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', 
  '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', 
  '#4A86E8', '#0000FF', '#9900FF', '#FF00FF', '#E6B8AF',
  '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#CFE2F3',
];

const CONTENT_CATEGORIES = [
  { value: 'announcement', label: '📢 Annonce' },
  { value: 'job', label: '💼 Offre d\'emploi' },
  { value: 'event', label: '🎉 Événement' },
  { value: 'article', label: '📰 Article' },
  { value: 'news', label: '📢 Actualité' },
  { value: 'blog', label: '✍️ Blog' },
  { value: 'opinion', label: '💬 Opinion' },
  { value: 'tutorial', label: '📚 Tutoriel' },
];

const UniversalAIEditor = ({ 
  onSubmit, 
  placeholder = 'Écrivez votre texte brut ici. L\'IA le structurera automatiquement...',
  submitLabel = 'Publier',
  showMediaUpload = true,
  maxMediaSize = 500
}: UniversalAIEditorProps) => {
  // Form state
  const [title, setTitle] = useState('');
  const [hook, setHook] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  
  // Editor state
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Media state
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Submit state
  const [submitting, setSubmitting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Table.configure({
        resizable: true,
        HTMLAttributes: { 
          class: 'border-collapse border border-border w-full my-4',
          style: 'width: 100%; border-collapse: collapse;'
        },
      }),
      TableRow.configure({ 
        HTMLAttributes: { class: 'border border-border' } 
      }),
      TableHeader.configure({ 
        HTMLAttributes: { 
          class: 'border border-border bg-muted font-semibold p-3 text-left',
          style: 'background: #f8f9fa; font-weight: 600; padding: 12px;'
        } 
      }),
      TableCell.configure({ 
        HTMLAttributes: { 
          class: 'border border-border p-3',
          style: 'padding: 12px; border: 1px solid #dee2e6;'
        } 
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none dark:prose-invert min-h-[200px]',
      },
    },
  });

  const setLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
    }
  }, [editor, linkUrl]);

  // Handle media upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const maxSize = maxMediaSize * 1024 * 1024;
    
    const validFiles = selectedFiles.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} dépasse la limite de ${maxMediaSize} MB`);
        return false;
      }
      return true;
    });

    setMediaFiles(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const preview = {
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name
      };
      setMediaPreviews(prev => [...prev, preview]);
    });
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // AI Generation - The core feature
  const generateWithAI = async () => {
    if (!editor) return;
    
    const rawText = editor.getText();
    if (!rawText.trim()) {
      toast.error('Écrivez du texte brut d\'abord, l\'IA le structurera automatiquement');
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-post', {
        body: { 
          rawContent: rawText,
          formFields: ['title', 'hook', 'hashtags', 'category', 'summary']
        }
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Auto-fill all form fields
      if (data.suggestedTitle) setTitle(data.suggestedTitle);
      if (data.suggestedHook) setHook(data.suggestedHook);
      if (data.hashtags && data.hashtags.length > 0) {
        setHashtags(data.hashtags);
      }
      if (data.category) setCategory(data.category);
      if (data.summary) setSummary(data.summary);
      
      // Replace content with structured version
      if (data.content) {
        editor.commands.setContent(data.content);
      }

      setHasGenerated(true);
      toast.success('✨ Contenu structuré avec succès! Tous les champs ont été remplis automatiquement.');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Erreur lors de la génération IA');
    } finally {
      setAiLoading(false);
    }
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!editor) return;
    
    const currentContent = editor.getHTML();
    if (!currentContent || currentContent === '<p></p>') {
      toast.error('Ajoutez du contenu');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title,
        hook,
        content: currentContent,
        hashtags,
        category,
        mediaFiles
      });
      
      // Reset form
      setTitle('');
      setHook('');
      setHashtags([]);
      setCategory('');
      setSummary('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setHasGenerated(false);
      editor.commands.setContent('');
      
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Add hashtag
  const addHashtag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').trim();
    if (cleanTag && !hashtags.includes(cleanTag)) {
      setHashtags([...hashtags, cleanTag]);
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter(h => h !== tag));
  };

  if (!editor) return null;

  return (
    <div className="border rounded-xl overflow-hidden bg-background shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Éditeur Universel IA</h3>
              <p className="text-xs text-muted-foreground">
                Écrivez du texte brut → L'IA structure tout automatiquement
              </p>
            </div>
          </div>
          
          <Button
            onClick={generateWithAI}
            disabled={aiLoading}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80"
          >
            {aiLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Structuration...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Auto-filled fields (shown after generation) */}
      {hasGenerated && (
        <div className="p-4 bg-muted/30 border-b space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            <span>Champs remplis automatiquement par l'IA (modifiables)</span>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Titre</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-semibold"
                placeholder="Titre de la publication"
              />
            </div>
            
            {/* Hook */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Phrase d'accroche</Label>
              <Input
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                className="italic text-muted-foreground"
                placeholder="Phrase captivante"
              />
            </div>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Hashtags
            </Label>
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 py-1">
                  #{tag}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => removeHashtag(tag)}
                  />
                </Badge>
              ))}
              <Input
                placeholder="Ajouter..."
                className="w-24 h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addHashtag((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="text-sm text-muted-foreground bg-background/50 p-3 rounded-lg">
              <span className="font-medium">Résumé IA:</span> {summary}
            </div>
          )}
        </div>
      )}

      {/* Main Editor Area */}
      <Tabs defaultValue="write" className="w-full">
        <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/20">
          <TabsList className="h-8">
            <TabsTrigger value="write" className="text-xs px-3">
              <Type className="h-3 w-3 mr-1" />
              Écrire
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs px-3">
              <Eye className="h-3 w-3 mr-1" />
              Aperçu
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{editor.getText().trim().split(/\s+/).filter(Boolean).length} mots</span>
          </div>
        </div>

        <TabsContent value="write" className="mt-0">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-0.5 p-2 border-b bg-muted/10">
            {/* Undo/Redo */}
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="h-8 w-8 p-0">
              <Undo className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="h-8 w-8 p-0">
              <Redo className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Headings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1">
                  <Heading1 className="h-4 w-4" />
                  <span className="text-xs">▼</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1" align="start">
                <div className="flex flex-col gap-0.5">
                  {[1, 2, 3, 4].map((level) => {
                    const HeadingIcon = [Heading1, Heading2, Heading3, Heading4][level - 1];
                    return (
                      <Button
                        key={level}
                        type="button"
                        variant={editor.isActive('heading', { level }) ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: level as any }).run()}
                        className="justify-start gap-2"
                      >
                        <HeadingIcon className="h-4 w-4" />
                        Titre {level}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Text Formatting */}
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-muted' : ''}`}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-muted' : ''}`}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-muted' : ''}`}>
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-muted' : ''}`}>
              <Strikethrough className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Colors */}
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <p className="text-xs font-medium mb-2">Couleur du texte</p>
                <div className="grid grid-cols-10 gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => editor.chain().focus().setColor(color).run()}
                      className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('highlight') ? 'bg-muted' : ''}`}>
                  <Highlighter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <p className="text-xs font-medium mb-2">Surlignage</p>
                <div className="grid grid-cols-10 gap-1">
                  {COLORS.slice(5).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                      className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Alignment */}
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}`}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}`}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}`}>
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-muted' : ''}`}>
              <AlignJustify className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Lists */}
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-muted' : ''}`}>
              <List className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-muted' : ''}`}>
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-muted' : ''}`}>
              <Quote className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Table */}
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('table') ? 'bg-muted' : ''}`}>
                  <TableIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tableau</p>
                  <div className="flex flex-col gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="justify-start gap-2">
                      <Plus className="h-3 w-3" /> Tableau 3×3
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()} className="justify-start gap-2">
                      <Plus className="h-3 w-3" /> Tableau 4×4
                    </Button>
                  </div>
                  {editor.isActive('table') && (
                    <div className="border-t pt-2 space-y-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnAfter().run()} className="w-full justify-start gap-2">
                        <ColumnsIcon className="h-3 w-3" /> + Colonne
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowAfter().run()} className="w-full justify-start gap-2">
                        <RowsIcon className="h-3 w-3" /> + Ligne
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteTable().run()} className="w-full justify-start gap-2 text-destructive">
                        <Trash2 className="h-3 w-3" /> Supprimer
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Link */}
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-muted' : ''}`}>
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-2">
                  <Input type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                  <div className="flex gap-1">
                    <Button type="button" size="sm" onClick={setLink} className="flex-1">Ajouter</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().unsetLink().run()}>Retirer</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Editor Content */}
          <ScrollArea className="h-[300px]">
            <EditorContent 
              editor={editor} 
              className="px-4 py-3 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:bg-muted [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_li]:mb-1"
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <ScrollArea className="h-[400px]">
            <div className="p-6 prose prose-sm max-w-none dark:prose-invert">
              {title && <h1 className="text-2xl font-bold mb-2">{title}</h1>}
              {hook && <p className="text-lg italic text-muted-foreground mb-4">{hook}</p>}
              <div dangerouslySetInnerHTML={{ __html: content }} />
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                  {hashtags.map(tag => (
                    <span key={tag} className="text-primary">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Media Upload */}
      {showMediaUpload && (
        <div className="p-4 border-t bg-muted/10">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Ajouter médias
            </Button>
            <span className="text-xs text-muted-foreground">
              Images, vidéos (max {maxMediaSize}MB)
            </span>
          </div>

          {mediaPreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative group rounded-lg overflow-hidden aspect-video bg-muted">
                  {preview.type.startsWith('image/') ? (
                    <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                  ) : preview.type.startsWith('video/') ? (
                    <video src={preview.url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Footer */}
      <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {hasGenerated && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Structuré par IA
            </Badge>
          )}
        </div>
        
        <Button 
          onClick={handleSubmit}
          disabled={submitting}
          className="gap-2 bg-gradient-to-r from-primary to-primary/80"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publication...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default UniversalAIEditor;
