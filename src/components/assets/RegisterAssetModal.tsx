import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { db } from '../../db/storage';
import { useAuth } from '../../services/authContext';
import { Asset, AssetCategoryType, AllocationCondition } from '../../types/hrms';
import { Check, AlertCircle } from 'lucide-react';

interface RegisterAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered?: () => void;
}

export const RegisterAssetModal: React.FC<RegisterAssetModalProps> = ({
  isOpen,
  onClose,
  onRegistered
}) => {
  const { currentUser } = useAuth();
  const assets = db.getAssets();

  const nextTag = `ORBYX-AST-${String(assets.length + 1).padStart(3, '0')}`;
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategoryType>('Laptop');
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseCost, setPurchaseCost] = useState<number | ''>(125000);
  const [purchaseDate, setPurchaseDate] = useState('2026-01-15');
  const [warrantyDate, setWarrantyDate] = useState('2029-01-14');
  const [supplier, setSupplier] = useState('Authorized Direct Supplier');
  const [location, setLocation] = useState('Bengaluru Tech Park - IT Room');
  const [condition, setCondition] = useState<AllocationCondition>('Brand New');
  const [error, setError] = useState<string | null>(null);
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [licenseSeats, setLicenseSeats] = useState<number | ''>(1);
  const [renewalDate, setRenewalDate] = useState('');
  const [subscriptionCost, setSubscriptionCost] = useState<number | ''>('');
  const [billingFrequency, setBillingFrequency] = useState<'Monthly' | 'Quarterly' | 'Annual' | 'One-time'>('Annual');
  const isDigital = ['Software License', 'Email Account', 'Subscription', 'Cloud Access'].includes(category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (isDigital && !(accountIdentifier.trim() || serialNumber.trim())) || (!isDigital && (!serialNumber.trim() || purchaseCost === ''))) {
      setError(isDigital ? 'Please fill in the resource name and account / license identifier.' : 'Please fill in asset name, serial number and purchase cost.');
      return;
    }

    // Check duplicate serial
    if (serialNumber.trim() && assets.some((a) => a.serialNumber.toLowerCase() === serialNumber.trim().toLowerCase())) {
      setError('An asset with this serial number is already registered.');
      return;
    }

    const newAsset: Asset = {
      id: `AST-2026-${String(assets.length + 1).padStart(3, '0')}`,
      assetTag: nextTag,
      name,
      category,
      brand,
      model: model || name,
      serialNumber: serialNumber.trim().toUpperCase(),
      purchaseDate,
      purchaseCost: Number(purchaseCost),
      warrantyExpiryDate: warrantyDate,
      supplier,
      location,
      condition,
      status: 'Available',
      acknowledgedByEmployee: false,
      assetType: isDigital ? 'Software & Digital' : 'Hardware',
      accountIdentifier: accountIdentifier.trim() || (isDigital ? serialNumber.trim() : undefined),
      licenseSeats: licenseSeats === '' ? undefined : Number(licenseSeats),
      renewalDate: renewalDate || undefined,
      subscriptionCost: subscriptionCost === '' ? undefined : Number(subscriptionCost),
      billingFrequency: isDigital ? billingFrequency : undefined
    };

    db.saveAsset(newAsset);

    db.logAudit({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      actorRole: 'hr_admin',
      action: 'CREATE',
      module: 'ASSET',
      entityId: newAsset.id,
      entityName: newAsset.assetTag,
      description: `Registered new asset ${newAsset.name} (${newAsset.assetTag})`
    });

    onRegistered?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Company Asset"
      description={`Generated Asset Tag: ${nextTag}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-slate-600 font-medium mb-1">Asset Name / Title *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MacBook Pro 16 M3 Max or Dell 4K Monitor"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            >
              <option value="Laptop">Laptop Workstation</option>
              <option value="Monitor">External Monitor</option>
              <option value="Mobile Device">Mobile Device</option>
              <option value="Accessories">Accessories & Peripherals</option>
              <option value="Office Furniture">Ergonomic Furniture</option>
              <option value="Software License">Software License</option>
              <option value="Email Account">Email Account</option>
              <option value="Subscription">Software / SaaS Subscription</option>
              <option value="Cloud Access">Cloud Service Access</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Brand / Provider *</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Apple, Dell, Lenovo"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Model Specification</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. 36GB RAM, 1TB SSD"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">{isDigital ? 'Account / License Identifier *' : 'Serial Number *'}</label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder={isDigital ? 'e.g. employee@company.com or LIC-0001' : 'e.g. C02G99887766'}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono uppercase"
              required={!isDigital}
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">{isDigital ? 'Initial / Purchase Cost (₹ INR)' : 'Purchase Cost (₹ INR) *'}</label>
            <input
              type="number"
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              required={!isDigital}
            />
          </div>

          {isDigital && <><div className="col-span-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3"><p className="mb-3 font-semibold text-indigo-900">Software / digital resource details</p><div className="grid grid-cols-2 gap-3"><label className="block text-slate-600 font-medium">Account identifier<input value={accountIdentifier} onChange={e=>setAccountIdentifier(e.target.value)} placeholder="Email / account / license ID" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5"/></label><label className="block text-slate-600 font-medium">License seats<input type="number" min="1" value={licenseSeats} onChange={e=>setLicenseSeats(e.target.value===''?'':Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5"/></label><label className="block text-slate-600 font-medium">Renewal / expiry date<input type="date" value={renewalDate} onChange={e=>setRenewalDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5"/></label><label className="block text-slate-600 font-medium">Recurring cost (₹)<input type="number" min="0" value={subscriptionCost} onChange={e=>setSubscriptionCost(e.target.value===''?'':Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5"/></label><label className="col-span-2 block text-slate-600 font-medium">Billing frequency<select value={billingFrequency} onChange={e=>setBillingFrequency(e.target.value as typeof billingFrequency)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5"><option>Monthly</option><option>Quarterly</option><option>Annual</option><option>One-time</option></select></label></div></div></>}

          <div>
            <label className="block text-slate-600 font-medium mb-1">Warranty Expiry Date</label>
            <input
              type="date"
              value={warrantyDate}
              onChange={(e) => setWarrantyDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>Save to Inventory</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
