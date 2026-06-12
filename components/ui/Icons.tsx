import { IconType } from "react-icons";
import {
  MdOutlineSearch,
  MdOutlineShoppingBag,
  MdMenu,
  MdClose,
  MdOutlineEdit,
  MdOutlineDelete,
  MdChevronLeft,
  MdChevronRight,
  MdOutlineInventory2,
  MdOutlinePointOfSale,
  MdOutlineLogout,
  MdOutlineFilterList,
  MdFilterList,
  MdMoreVert,
  MdOutlineVisibilityOff,
  MdOutlineVisibility,
} from "react-icons/md";
import { ComponentProps } from "react";

export const Icons = {
  search: MdOutlineSearch,
  cart: MdOutlineShoppingBag,
  menu: MdMenu,
  close: MdClose,
  edit: MdOutlineEdit,
  delete: MdOutlineDelete,
  chevronLeft: MdChevronLeft,
  chevronRight: MdChevronRight,
  catalog: MdOutlineInventory2,
  sales: MdOutlinePointOfSale,
  logout: MdOutlineLogout,
  filter: MdOutlineFilterList,
  filterActive: MdFilterList,
  more: MdMoreVert,
  visibilityOff: MdOutlineVisibilityOff,
  visibility: MdOutlineVisibility,
} as const;

export type IconName = keyof typeof Icons;

type IconProps = ComponentProps<IconType> & {
  name: IconName;
};

export default function Icon({ name, ...props }: IconProps) {
  const IconComponent = Icons[name] as IconType;
  
  return <IconComponent {...props} />;
}
