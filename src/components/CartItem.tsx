import React from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Trash2, Minus, Plus } from "lucide-react";
import { CartItemType } from "./CartPage";
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const handleQuantityChange = (change: number) => {
    const newQuantity = Math.max(0, item.quantity + change);
    onUpdateQuantity(item.id, newQuantity);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    if (value >= 0) {
      onUpdateQuantity(item.id, value);
    }
  };

  return (
    <div className="flex gap-4 py-4">
      {/* Artwork Image */}
      <div className="flex-shrink-0">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden bg-muted">
          <ImageWithFallback
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Item Details */}
      <div className="flex-grow">
        <div className="flex flex-col md:flex-row md:justify-between gap-2">
          <div className="flex-grow">
            <h3 className="font-medium">{item.title}</h3>
            <p className="text-sm text-muted-foreground">by {item.artist}</p>
            <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground mt-1">
              <span>{item.size}</span>
              <span>{item.medium}</span>
            </div>
          </div>
          
          {/* Price */}
          <div className="text-right">
            <p className="font-medium">${item.price.toFixed(2)}</p>
            {item.quantity > 1 && (
              <p className="text-sm text-muted-foreground">
                ${(item.price * item.quantity).toFixed(2)} total
              </p>
            )}
          </div>
        </div>

        {/* Quantity Controls and Remove */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(-1)}
              disabled={item.quantity <= 1}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-3 w-3" />
            </Button>
            
            <Input
              type="number"
              value={item.quantity}
              onChange={handleInputChange}
              className="w-16 h-8 text-center"
              min="0"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(1)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm" 
            onClick={() => onRemove(item.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}