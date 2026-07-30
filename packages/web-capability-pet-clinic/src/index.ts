import { registerWidget } from '@blockhub/web-core'
import { PetClinicWidget } from './PetClinicWidget'

import './locales'
registerWidget('PetClinicWidget', PetClinicWidget as Parameters<typeof registerWidget>[1])
export { PetClinicWidget }
