import { registerWidget } from '@blockhub/web-core'
import { PetClinicWidget } from './PetClinicWidget'

registerWidget('PetClinicWidget', PetClinicWidget as Parameters<typeof registerWidget>[1])
export { PetClinicWidget }
