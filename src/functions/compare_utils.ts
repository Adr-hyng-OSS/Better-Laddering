import { ItemType ,Vector3, BlockType, EffectType, EnchantmentType, EntityType } from "@minecraft/server";

type SelectedTypes = ItemType | BlockType | EffectType | EntityType | EnchantmentType | string | number | boolean;

class Compare {
    static locations = class {
        static isEqual(a: Vector3, b: Vector3): boolean {
            return a.x === b.x && a.y === b.y && a.z === b.z;
        }
    }

    static types = class {
        static isEqual(a: SelectedTypes, b: SelectedTypes): boolean {
            if (a.constructor !== b.constructor) {
                throw new Error("Types of a and b are not the same");
            }
            return a === b;
        }
    }
    
}

export {Compare};
