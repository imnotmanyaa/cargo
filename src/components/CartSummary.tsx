import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Truck, Shield, CreditCard, Tag, X, Check } from "lucide-react";

interface CartSummaryProps {
  subtotal: number;
  promoDiscount: number;
  appliedPromo: {code: string, discount: number} | null;
  tax: number;
  shipping: number;
  total: number;
  itemCount: number;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  onApplyPromoCode: (code: string) => boolean;
  onRemovePromoCode: () => void;
}

export function CartSummary({ 
  subtotal, 
  promoDiscount, 
  appliedPromo, 
  tax, 
  shipping, 
  total, 
  itemCount,
  promoCode,
  onPromoCodeChange,
  onApplyPromoCode,
  onRemovePromoCode
}: CartSummaryProps) {
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(false);

  const freeShippingThreshold = 200;
  const remainingForFreeShipping = freeShippingThreshold - (subtotal - promoDiscount);

  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    const success = onApplyPromoCode(promoCode);
    if (success) {
      setPromoError('');
      setPromoSuccess(true);
      setTimeout(() => setPromoSuccess(false), 3000);
    } else {
      setPromoError('Invalid promo code');
      setPromoSuccess(false);
    }
  };

  const handleRemovePromo = () => {
    onRemovePromoCode();
    setPromoError('');
    setPromoSuccess(false);
  };

  const handlePromoCodeChange = (value: string) => {
    onPromoCodeChange(value);
    setPromoError('');
    setPromoSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Promo Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Promo Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appliedPromo ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {appliedPromo.code}
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-500">
                    ({(appliedPromo.discount * 100).toFixed(0)}% off)
                  </span>
                </div>
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={handleRemovePromo}
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-grow">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => handlePromoCodeChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                    className={promoError ? "border-destructive" : ""}
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleApplyPromo}
                  disabled={!promoCode.trim()}
                >
                  Apply
                </Button>
              </div>
              
              {promoError && (
                <p className="text-sm text-destructive">{promoError}</p>
              )}
              
              {promoSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Promo code applied successfully!
                </p>
              )}
              
              <div className="text-xs text-muted-foreground">
                <p>Try: BOTANICAL10, SPRING15, or FIRST20</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Subtotal ({itemCount} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          {appliedPromo && promoDiscount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Discount ({appliedPromo.code})</span>
              <span>-${promoDiscount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Shipping</span>
            <div className="text-right">
              {shipping === 0 ? (
                <Badge variant="secondary" className="text-xs">Free</Badge>
              ) : (
                <span>${shipping.toFixed(2)}</span>
              )}
            </div>
          </div>

          {remainingForFreeShipping > 0 && shipping > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm">
                Add <span className="font-medium">${remainingForFreeShipping.toFixed(2)}</span> more for free shipping!
              </p>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between font-medium text-lg">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <Button className="w-full" size="lg">
            <CreditCard className="mr-2 h-4 w-4" />
            Proceed to Checkout
          </Button>
        </CardContent>
      </Card>

      {/* Trust Badges */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Free Shipping</p>
                <p className="text-xs text-muted-foreground">On orders over $200</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Secure Packaging</p>
                <p className="text-xs text-muted-foreground">Art safely packed & insured</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Artist Note */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              "Each piece is carefully created with love and attention to botanical detail."
            </p>
            <p className="text-xs font-medium">— Elena, Botanical Artist</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}