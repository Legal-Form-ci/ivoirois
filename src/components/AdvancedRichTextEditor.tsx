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
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  List, ListOrdered, Table as TableIcon, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  Palette, Image as ImageIcon, Link as LinkIcon, Highlighter,
  Plus, Minus, RowsIcon, ColumnsIcon, Trash2
} from 'lucide-react';
import { useState, useCallback } from 'react';

interface AdvancedRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
  '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
];

const AdvancedRichTextEditor = ({ 
  content, 
  onChange, 
  placeholder = 'Écrivez quelque chose...', 
  minHeight = '150px' 
}: AdvancedRichTextEditorProps) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-border w-full my-4',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border border-border',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-border bg-muted font-semibold p-2 text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border p-2',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none dark:prose-invert',
      },
    },
  });

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
    }
  }, [editor, imageUrl]);

  const setLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
    }
  }, [editor, linkUrl]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Main Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-2 border-b bg-muted/30">
        {/* Undo/Redo */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1 self-center" />

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
              {[1, 2, 3, 4, 5, 6].map((level) => {
                const HeadingIcon = [Heading1, Heading2, Heading3, Heading4, Heading5, Heading6][level - 1];
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

        <div className="w-px h-6 bg-border mx-1 self-center" />

        {/* Text Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-muted' : ''}`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-muted' : ''}`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-muted' : ''}`}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-muted' : ''}`}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1 self-center" />

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-10 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => editor.chain().focus().setColor(color).run()}
                  className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className={`h-8 w-8 p-0 ${editor.isActive('highlight') ? 'bg-muted' : ''}`}
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-10 gap-1">
              {COLORS.slice(10).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                  className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1 self-center" />

        {/* Alignment */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}`}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}`}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}`}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-muted' : ''}`}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1 self-center" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-muted' : ''}`}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-muted' : ''}`}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1 self-center" />

        {/* Table */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className={`h-8 w-8 p-0 ${editor.isActive('table') ? 'bg-muted' : ''}`}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium">Tableau</p>
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                  className="justify-start gap-2"
                >
                  <Plus className="h-3 w-3" />
                  Insérer tableau 3x3
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editor.chain().focus().insertTable({ rows: 5, cols: 5, withHeaderRow: true }).run()}
                  className="justify-start gap-2"
                >
                  <Plus className="h-3 w-3" />
                  Insérer tableau 5x5
                </Button>
              </div>
              {editor.isActive('table') && (
                <div className="border-t pt-2 mt-2 space-y-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                    className="w-full justify-start gap-2"
                  >
                    <ColumnsIcon className="h-3 w-3" />
                    Ajouter colonne
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                    className="w-full justify-start gap-2"
                  >
                    <RowsIcon className="h-3 w-3" />
                    Ajouter ligne
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                    className="w-full justify-start gap-2"
                  >
                    <Minus className="h-3 w-3" />
                    Supprimer colonne
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().deleteRow().run()}
                    className="w-full justify-start gap-2"
                  >
                    <Minus className="h-3 w-3" />
                    Supprimer ligne
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    className="w-full justify-start gap-2 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Supprimer tableau
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1 self-center" />

        {/* Link */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-muted' : ''}`}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://exemple.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <div className="flex gap-1">
                <Button type="button" size="sm" onClick={setLink} className="flex-1">
                  Ajouter
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={() => editor.chain().focus().unsetLink().run()}
                >
                  Retirer
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="URL de l'image..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Button type="button" size="sm" onClick={addImage} className="w-full">
                Insérer image
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="px-4 py-3 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:bg-muted [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none"
        style={{ minHeight }}
      />
    </div>
  );
};

export default AdvancedRichTextEditor;
