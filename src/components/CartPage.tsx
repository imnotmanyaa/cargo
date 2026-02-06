import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { ShoppingBag, ArrowLeft, MessageSquare } from "lucide-react";

export interface CartItemType {
  id: string;
  title: string;
  artist: string;
  price: number;
  quantity: number;
  imageUrl: string;
  size: string;
  medium: string;
}

export function CartPage() {
  const [cartItems, setCartItems] = useState<CartItemType[]>([
    {
      id: "1",
      title: "Monstera Deliciosa Study",
      artist: "Elena Botanical",
      price: 85.00,
      quantity: 1,
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
      size: "8\" x 10\"",
      medium: "Watercolor on Paper"
    },
    {
      id: "2", 
      title: "Eucalyptus Branch",
      artist: "Elena Botanical",
      price: 75.00,
      quantity: 2,
      imageUrl: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop",
      size: "11\" x 14\"",
      medium: "Gouache on Paper"
    },
    {
      id: "3",
      title: "Fern Collection",
      artist: "Elena Botanical", 
      price: 120.00,
      quantity: 1,
      imageUrl: "https://images.unsplash.com/photo-1440581572325-0bea30075d9d?w=400&h=400&fit=crop",
      size: "16\" x 20\"",
      medium: "Mixed Media"
    }
  ]);

  const [orderNotes, setOrderNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{code: string, discount: number} | null>(null);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItem(id);
      return;
    }
    setCartItems(items => 
      items.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const applyPromoCode = (code: string) => {
    // Mock promo code validation - in real app this would be an API call
    const promoCodes: {[key: string]: number} = {
      'BOTANICAL10': 0.10, // 10% off
      'SPRING15': 0.15,    // 15% off
      'FIRST20': 0.20,     // 20% off
    };

    const discount = promoCodes[code.toUpperCase()];
    if (discount) {
      setAppliedPromo({ code: code.toUpperCase(), discount });
      return true;
    }
    return false;
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode('');
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const promoDiscount = appliedPromo ? subtotal * appliedPromo.discount : 0;
  const discountedSubtotal = subtotal - promoDiscount;
  const tax = discountedSubtotal * 0.08; // 8% tax
  const shipping = cartItems.length > 0 ? 15.00 : 0;
  const total = discountedSubtotal + tax + shipping;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
            
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="mb-2">Your cart is empty</h2>
                <p className="text-muted-foreground text-center mb-6">
                  Discover beautiful botanical artwork to add to your collection
                </p>
                <Button>
                  Browse Artwork
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Shopping Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item, index) => (
                    <div key={item.id}>
                      <CartItem 
                        item={item}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeItem}
                      />
                      {index < cartItems.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Order Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Special Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="order-notes">Add a note to your order (optional)</Label>
                    <Textarea
                      id="order-notes"
                      placeholder="Any special requests, gift messages, or packaging instructions..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Examples: "Please gift wrap this item", "This is a gift for my mother", "Handle with extra care"
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <CartSummary 
                subtotal={subtotal}
                promoDiscount={promoDiscount}
                appliedPromo={appliedPromo}
                tax={tax}
                shipping={shipping}
                total={total}
                itemCount={cartItems.length}
                promoCode={promoCode}
                onPromoCodeChange={setPromoCode}
                onApplyPromoCode={applyPromoCode}
                onRemovePromoCode={removePromoCode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}