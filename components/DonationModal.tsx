import React from 'react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">💝 Support This Project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <div className="text-center">
          <p className="mb-4 text-gray-600">
            Help keep this project free and open source! Your support helps with development and server costs.
          </p>
          
          <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" className="inline-block">
            <input type="hidden" name="cmd" value="_s-xclick" />
            <input type="hidden" name="hosted_button_id" value="66X23LVXDKZAN" />
            <table className="w-full mb-4">
              <tbody>
                <tr>
                  <td className="pb-2">
                    <input type="hidden" name="on0" value="Voluntary Sponsorship.Thanks"/>
                    <label className="block text-sm font-medium text-gray-700">
                      Voluntary Sponsorship Message
                    </label>
                  </td>
                </tr>
                <tr>
                  <td>
                    <input 
                      type="text" 
                      name="os0" 
                      maxLength={200}
                      placeholder="Optional message..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <input type="hidden" name="currency_code" value="USD" />
            <input 
              type="image" 
              src="https://www.paypalobjects.com/en_US/i/btn/btn_paynowCC_LG.gif" 
              name="submit" 
              title="PayPal - The safer, easier way to pay online!" 
              alt="Donate with PayPal button"
              className="hover:opacity-80 transition-opacity"
            />
          </form>
          
          <p className="text-xs text-gray-500 mt-4">
            All donations are voluntary and help support development
          </p>
        </div>
      </div>
    </div>
  );
};