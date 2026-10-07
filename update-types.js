const fs = require('fs');
const files = [
  'packages/shared/src/types/database.ts',
  'packages/shared/src/types/database.types.ts'
];
for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/(\"copied_from_user_id\": string \| null),/g, '$1,"counter_count": number,"counter_enabled": boolean,"counter_label": string | null,"counter_target": number | null,');
    content = content.replace(/(\"copied_from_user_id\"\?: string \| null),/g, '$1,"counter_count"?: number,"counter_enabled"?: boolean,"counter_label"?: string | null,"counter_target"?: number | null,');
    fs.writeFileSync(file, content);
  }
}
