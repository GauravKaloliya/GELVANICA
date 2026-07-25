import { Code2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '../SettingsField'
import type { AppSettings } from '@shared/types'
import type { SettingsUpdateFn } from '../KeyboardShortcutsSettings'

export function EditorTab({ settings, update }: { settings: AppSettings; update: SettingsUpdateFn }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-4 w-4" /> Editor
        </CardTitle>
        <CardDescription>Default block type and editing behaviour</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-2" />
        <FieldGroup label="Default block type" description="New blocks start as this type">
          <Select value={settings.editor.default_block_type} onValueChange={(v) => update('editor', 'default_block_type', v as AppSettings['editor']['default_block_type'])}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="heading_1">Heading 1</SelectItem>
              <SelectItem value="heading_2">Heading 2</SelectItem>
              <SelectItem value="heading_3">Heading 3</SelectItem>
              <SelectItem value="bulleted_list">Bulleted List</SelectItem>
              <SelectItem value="numbered_list">Numbered List</SelectItem>
              <SelectItem value="to_do">To-Do</SelectItem>
              <SelectItem value="code">Code</SelectItem>
              <SelectItem value="quote">Quote</SelectItem>
              <SelectItem value="callout">Callout</SelectItem>
              <SelectItem value="table">Table</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>
        <Separator />
        <FieldGroup label="Auto-close brackets" description="Automatically insert closing brackets and quotes">
          <Switch checked={settings.editor.auto_close_brackets} onCheckedChange={(v) => update('editor', 'auto_close_brackets', v)} />
        </FieldGroup>
        <Separator />
        <FieldGroup label="Spellcheck" description="Enable built-in spell checking in the editor">
          <Switch checked={settings.editor.spellcheck} onCheckedChange={(v) => update('editor', 'spellcheck', v)} />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
